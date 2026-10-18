import { Logger } from '@nestjs/common'
import type { NextFunction, Request, Response } from 'express'

import { resolveLanguage } from '../common/i18n/messages'
import { MemoryStore, RedisStore, type CacheStore } from './cache.store'

/**
 * A safety net, not the invalidation: every write retires the cache at once
 * (see below). It bounds what a time-dependent answer can lag — the
 * schedule's "this week" — and how long an orphaned entry takes space.
 */
const TTL_SECONDS = 10 * 60
/** Bigger answers are served straight from the database rather than copied into Redis. */
const MAX_BODY = 2 * 1024 * 1024

/**
 * What visitors read: the public content, which changes only when the admin
 * edits it. The admin's own tools (minutes, trash, audit, dashboard),
 * sign-in, files and downloads are never cached.
 */
const CACHED = /^\/api\/(competitions|studies|graduates|staff|textbooks|chronology|events|news|courses|schedule|content|gallery|terms|materials)(\/|\?|$)/
const NEVER = /\/download(\?|$)/
/** Requests that cannot have changed content, so they do not retire the cache. */
const NO_EFFECT = /^\/api\/(auth|uploads)\//

/**
 * HTTP cache for the public API, as one Express middleware in front of Nest.
 *
 * - **Hit**: the stored JSON is sent as is — no guard, no controller, no
 *   database, no serialisation; one Redis round trip.
 * - **Who**: only anonymous requests. A request with a token (the admin)
 *   always goes to the database, so drafts and fresh edits are never served
 *   from, or written into, the shared cache.
 * - **Key**: the full URL (query included) and the request's language, which
 *   some answers (사이트 콘텐츠) depend on.
 * - **Invalidation**: any successful POST / PATCH / PUT / DELETE moves the
 *   generation on, retiring every entry at once. Edits are rare and reads
 *   are many, and the content is linked (a semester's dates move its
 *   classes and events, a restore from the trash can touch anything), so
 *   one switch is both the simplest and the only always-correct rule.
 *   Connecting to Redis retires it too (see RedisStore).
 *
 * Responses carry `X-Cache: HIT | MISS` for checking from outside.
 */
export class HttpCache {
  private readonly logger = new Logger('Cache')
  readonly store: CacheStore

  constructor(redisUrl = process.env.REDIS_URL?.trim()) {
    this.store = redisUrl ? new RedisStore(redisUrl) : new MemoryStore()
    if (!redisUrl) this.logger.log('REDIS_URL is not set — caching in this process only.')
  }

  readonly middleware = (request: Request, response: Response, next: NextFunction) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      if (request.method !== 'OPTIONS' && !NO_EFFECT.test(request.originalUrl)) {
        response.on('finish', () => {
          if (response.statusCode < 400) {
            this.store.bump().catch((err: Error) => this.logger.warn(`Retiring the cache failed: ${err.message}`))
          }
        })
      }
      return next()
    }

    if (!this.cacheable(request)) return next()

    const key = `${resolveLanguage(request.headers['accept-language'])}:${request.originalUrl}`

    this.store
      .read(key)
      .then(({ generation, body }) => {
        if (body !== null) {
          response.setHeader('X-Cache', 'HIT')
          response.type('application/json').send(body)
          return
        }

        response.setHeader('X-Cache', 'MISS')
        // Express's res.json() ends in res.send(<json text>): the text is
        // taken there, on its way out, exactly as the client receives it.
        const send = response.send.bind(response)
        response.send = (payload?: unknown) => {
          if (
            response.statusCode === 200 &&
            typeof payload === 'string' &&
            payload.length <= MAX_BODY &&
            String(response.getHeader('Content-Type') ?? '').includes('application/json')
          ) {
            this.store.write(generation, key, payload, TTL_SECONDS).catch(() => {})
          }
          return send(payload)
        }
        next()
      })
      // Redis failing mid-request: answer from the database.
      .catch(() => next())
  }

  async close() {
    await this.store.close()
  }

  private cacheable(request: Request) {
    return (
      CACHED.test(request.originalUrl) &&
      !NEVER.test(request.originalUrl) &&
      !request.headers.authorization &&
      request.query.token === undefined
    )
  }
}

let instance: HttpCache | null = null

/** The one cache, created on first use — after ConfigModule has read .env. */
export function httpCache() {
  instance ??= new HttpCache()
  return instance
}
