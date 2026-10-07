import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common'
import type { Request } from 'express'
import { catchError, tap, throwError, type Observable } from 'rxjs'

import type { AuthUser } from '../auth/auth.service'
import { AuditService } from './audit.service'
import type { AuditAction } from './entities/audit-log.entity'

/** Routes that change nothing a person would look for in the journal. */
const SKIPPED = new Set(['uploads'])

type Described = { action: AuditAction; type: string | null; id: string | null; changes: string[]; labelFirst: boolean }

/**
 * Reads what a request does from its method and path — the API is regular:
 * `/<type>`, `/<type>/:id`, `/<type>/:id/publish`, `/<type>/order`,
 * `/trash/:type/:id(/restore)`, `/content/:slug/:locale`, `/auth/login`.
 */
function describe(request: Request): Described | null {
  const segments = request.path
    .replace(/^\/api\//, '')
    .split('/')
    .filter(Boolean)
  const [resource, second, third, fourth] = segments
  const method = request.method
  const body = (request.body ?? {}) as Record<string, unknown>
  const fields = Object.keys(body)

  if (!resource || SKIPPED.has(resource) || method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return null

  if (resource === 'auth') {
    return second === 'login' ? { action: 'login', type: null, id: null, changes: [], labelFirst: false } : null
  }

  if (resource === 'trash' && second && third) {
    const restore = method === 'POST' && fourth === 'restore'
    return { action: restore ? 'restore' : 'purge', type: second, id: third, changes: [], labelFirst: true }
  }

  if (resource === 'content' && second && third) {
    return { action: 'update', type: 'content', id: `${second}/${third}`, changes: fields, labelFirst: false }
  }

  if (second === 'order') return { action: 'reorder', type: resource, id: null, changes: [], labelFirst: false }
  if (third === 'publish' || third === 'unpublish') return { action: third, type: resource, id: second, changes: [], labelFirst: false }

  switch (method) {
    case 'POST':
      return { action: 'create', type: resource, id: null, changes: [], labelFirst: false }
    case 'PATCH':
    case 'PUT': {
      // Only the publish switch moved: say so plainly.
      const publishOnly = fields.length === 1 && fields[0] === 'isPublished'
      const action: AuditAction = publishOnly ? (body.isPublished ? 'publish' : 'unpublish') : 'update'
      return { action, type: resource, id: second ?? null, changes: publishOnly ? [] : fields, labelFirst: false }
    }
    case 'DELETE':
      return { action: 'delete', type: resource, id: second ?? null, changes: [], labelFirst: true }
    default:
      return null
  }
}

/**
 * Writes 작업 기록 for every change made through the API — globally, so no
 * service has to remember to. A change is recorded once it succeeded; a
 * failed one is not a change (a refused sign-in is the exception: that is
 * exactly what someone would look for).
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly audit: AuditService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest<Request & { user?: AuthUser | null }>()
    const described = describe(request)

    if (!described) return next.handle()

    const ip = request.ip ?? null

    if (described.action === 'login') {
      const username = String((request.body as { username?: unknown })?.username ?? '').trim() || '?'
      return next.handle().pipe(
        tap(() => void this.audit.record({ actor: username, action: 'login', ip })),
        catchError((error: unknown) => {
          void this.audit.record({ actor: username, action: 'login_failed', ip })
          return throwError(() => error)
        }),
      )
    }

    const actor = request.user?.username ?? 'anonymous'
    // A delete, restore or purge returns no record: read its name first.
    const labelBefore = described.labelFirst && described.type && described.id ? await this.audit.labelOf(described.type, described.id) : ''

    return next.handle().pipe(
      tap((response: unknown) => {
        const responseId = response && typeof response === 'object' ? (response as { id?: unknown }).id : undefined
        void this.audit.record({
          actor,
          action: described.action,
          entityType: described.type,
          entityId: described.id ?? (typeof responseId === 'string' ? responseId : null),
          label: labelBefore || this.audit.labelFrom(described.type, response) || described.id || '',
          changes: described.changes,
          ip,
        })
      }),
    )
  }
}
