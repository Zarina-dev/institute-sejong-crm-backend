import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata, UnauthorizedException, createParamDecorator } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { Request } from 'express'

import { AuthService, type AuthRole, type AuthUser } from './auth.service'

export const ROLES_KEY = 'auth:roles'

/**
 * Marks a handler (or a whole controller) as requiring a signed-in user.
 * With no roles, any authenticated user passes; with roles, one must match.
 */
export const Authenticated = (...roles: AuthRole[]) => SetMetadata(ROLES_KEY, roles)

/** The verified user of the current request (only meaningful behind `Authenticated`). */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthUser | null => {
  return (ctx.switchToHttp().getRequest<Request & { user?: AuthUser | null }>().user) ?? null
})

/**
 * Registered globally: every route is open unless it carries `Authenticated`.
 * Reads `Authorization: Bearer <token>`; also accepts `?token=` so plain
 * `<a href>` downloads can be authorised.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<AuthRole[] | undefined>(ROLES_KEY, [context.getHandler(), context.getClass()])
    const request = context.switchToHttp().getRequest<Request & { user?: AuthUser | null }>()
    const user = this.authService.verify(this.extractToken(request))
    request.user = user

    if (roles === undefined) {
      return true
    }

    if (!user) {
      throw new UnauthorizedException('errors.auth.required')
    }

    if (roles.length > 0 && !roles.includes(user.role)) {
      throw new ForbiddenException('errors.auth.forbidden')
    }

    return true
  }

  private extractToken(request: Request): string | undefined {
    const header = request.headers.authorization

    if (header?.startsWith('Bearer ')) {
      return header.slice('Bearer '.length).trim()
    }

    const query = request.query.token
    return typeof query === 'string' ? query : undefined
  }
}