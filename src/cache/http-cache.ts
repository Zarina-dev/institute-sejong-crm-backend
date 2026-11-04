import { Logger } from '@nestjs/common'
import type { NextFunction, Request, Response } from 'express'

import { resolveLanguage } from '../common/i18n/messages'
import { encodeEntry, etagMatches, etagOf, pick, type CachedEntry, type Encoding } from './cache.entry'
import { MemoryStore, RedisStore, type CacheHit, type CacheStore } from './cache.store'

/**
 * A safety net, not the invalidation: every write retires the cache at once
 * (see below). It bounds what a time-dependent answer can lag — the
 * schedule's "this week" — and how long an orphaned entry takes space.
 */
const TTL_SECONDS = 10 * 60
/** Bigger answers are served straight from the database rather than copied into Redis. */
const MAX_BODY = 2 * 1024 * 1024
/** How long a request waits for the identical one already at the database (single flight) before asking it itself. */
const FOLLOW_TIMEOUT_MS = 8000
/** What a browser may keep of a public answer: 30 s fresh, then a minute more while it refetches. */
const BROWSER_CACHE = 'public, max-age=30, stale-while-revalidate=60'

/**
 * What visitors read: the public content, which changes only when the admin
 * edits it. The admin's own tools (minutes, trash, audit, dashboard),
 * sign-in, files and downloads are never cached.
 */
const CACHED = /^\/api\/(home|competitions|studies|graduates|staff|textbooks|chronology|events|news|courses|schedule|content|gallery|terms|materials)(\/|\?|$)/
const NEVER = /\/download(\?|$)/
/** Requests that cannot have changed content, so they do not retire the cache. */
const NO_EFFECT = /^\/api\/(auth|uploads)\//

/**
 * HTTP cache for the public API, as one Express middleware in front of Nest.
 *
 * - **Hit**: the stored JSON is sent as is — no guard, no controller, no
 *   database, no serialisation, no compression (gzip and brotli forms are
 *   stored ready-made, and the one the client accepts is sent); one Redis
 *   round trip. It carries an ETag, and a revisit with `If-None-Match` is a
 *   304 without the body leaving Redis.
 * - **Miss**: concurrent requests for one address share one database query.
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

  /** Counts the writes this process has seen finish — see `miss`. */
  private epoch = 0
  /** Misses being answered right now by the database, by key: later requests for the same key wait for it. */
  private readonly inflight = new Map<string, Promise<CachedEntry | null>>()

  readonly middleware = (request: Request, response: Response, next: NextFunction) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      if (request.method !== 'OPTIONS' && !NO_EFFECT.test(request.originalUrl)) {
        response.on('finish', () => {
          if (response.statusCode < 400) {
            this.epoch += 1
            this.store.bump().catch((err: Error) => this.logger.warn(`Retiring the cache failed: ${err.message}`))
          }
        })
      }
      return next()
    }

    if (!this.cacheable(request)) return next()

    const key = `${resolveLanguage(request.headers['accept-language'])}:${request.originalUrl}`
    // The form of the answer this client can take: brotli, gzip or as is.
    const wanted = (request.acceptsEncodings('br', 'gzip') || 'identity') as Encoding
    const ifNoneMatch = String(request.headers['if-none-match'] ?? '')

    this.store.read(key, wanted, ifNoneMatch).then(
      ({ generation, hit }) => {
        try {
          // The browser (and any CDN) may keep a public answer briefly too, so
          // moving between pages and coming back costs no request. Short on
          // purpose: an edit retires Redis at once, but not copies already out.
          // Added to, not replaced: CORS has already put `Origin` there.
          response.vary('Accept-Language').vary('Authorization').vary('Accept-Encoding')
          if (hit) this.sendHit(response, hit)
          else this.miss(request, response, next, generation, key, wanted, ifNoneMatch)
        } catch (err) {
          next(err)
        }
      },
      // Redis failing mid-request: answer from the database.
      () => next(),
    )
  }

  /** A stored answer, sent as the bytes it was stored as: no compression, no hashing, no serialising. */
  private sendHit(response: Response, hit: CacheHit) {
    response.setHeader('X-Cache', 'HIT')
    response.setHeader('Cache-Control', BROWSER_CACHE)
    // A weak validator: the same answer leaves in several encodings.
    response.setHeader('ETag', `W/${hit.etag}`)
    if (hit.encoding === 'not-modified' || !hit.body) {
      // The browser's copy is current — after max-age=30 this is all a revisit costs.
      response.status(304).end()
      return
    }
    response.status(200).type('application/json')
    // `compression` leaves an answer that already has a Content-Encoding alone.
    if (hit.encoding !== 'identity') response.setHeader('Content-Encoding', hit.encoding)
    response.setHeader('Content-Length', hit.body.length)
    response.end(hit.body)
  }

  /** An entry the process holds in memory (a coalesced answer): the same as a hit, chosen here. */
  private sendEntry(response: Response, entry: CachedEntry, wanted: Encoding, ifNoneMatch: string) {
    const { encoding, body } = pick(entry, wanted)
    this.sendHit(response, etagMatches(ifNoneMatch, entry.etag) ? { etag: entry.etag, encoding: 'not-modified', body: null } : { etag: entry.etag, encoding, body })
  }

  /**
   * Nothing stored: the database answers, and the answer is stored on its way out.
   *
   * **Single flight.** After an edit every public address is a miss at once,
   * and a busy moment sends many visitors to the same one. The first request
   * goes to the database; the others for the same address wait for its
   * answer instead of repeating the query (N visitors, one query). If the
   * first one fails or does not return something cacheable (a 404, an
   * error), they each go to the database themselves; none waits more than
   * FOLLOW_TIMEOUT. Per process — the instances do not coordinate.
   *
   * The key carries the generation and `epoch`: a request that arrives
   * after an edit has finished never joins a query that started before it.
   */
  private miss(request: Request, response: Response, next: NextFunction, generation: string, key: string, wanted: Encoding, ifNoneMatch: string) {
    const flightKey = `${this.epoch}|${generation}|${key}`
    const leading = this.inflight.get(flightKey)

    if (leading) {
      let timer: NodeJS.Timeout | undefined
      const timeout = new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), FOLLOW_TIMEOUT_MS)
      })
      void Promise.race([leading, timeout]).then((entry) => {
        clearTimeout(timer)
        if (response.destroyed) return
        try {
          if (entry) {
            response.setHeader('X-Cache', 'HIT')
            this.sendEntry(response, entry, wanted, ifNoneMatch)
          } else next()
        } catch (err) {
          next(err)
        }
      })
      return
    }

    let settle!: (entry: CachedEntry | null) => void
    const flight = new Promise<CachedEntry | null>((resolve) => (settle = resolve))
    this.inflight.set(flightKey, flight)
    const done = (entry: CachedEntry | null) => {
      if (this.inflight.get(flightKey) === flight) this.inflight.delete(flightKey)
      settle(entry)
    }
    // Not cacheable (or never answered): release whoever is waiting. Once an
    // answer has been captured, the encoding below settles it instead.
    let captured = false
    response.once('close', () => {
      if (!captured) done(null)
    })

    response.setHeader('X-Cache', 'MISS')
    // Express's res.json() ends in res.send(<json text>): the text is
    // taken there, on its way out, exactly as the client receives it.
    const send = response.send.bind(response)
    response.send = (payload?: unknown) => {
      const cacheable =
        response.statusCode === 200 &&
        typeof payload === 'string' &&
        payload.length <= MAX_BODY &&
        String(response.getHeader('Content-Type') ?? '').includes('application/json')
      let etag = ''
      if (cacheable) {
        captured = true
        // The same validator the next hit will carry, so a browser holding
        // this response is answered 304 by the cache (Express answers 304
        // itself here when If-None-Match matches the ETag set below).
        etag = etagOf(payload as string)
        if (!response.getHeader('ETag')) response.setHeader('ETag', `W/${etag}`)
      }
      if (response.statusCode === 200 && !response.getHeader('Cache-Control')) response.setHeader('Cache-Control', BROWSER_CACHE)
      const sent = send(payload)
      // After the response is on its way: compressing and storing add nothing to it.
      if (cacheable) {
        encodeEntry(payload as string, etag).then(
          (entry) => {
            this.store.write(generation, key, entry, TTL_SECONDS).catch(() => {})
            done(entry)
          },
          () => done(null),
        )
      }
      return sent
    }
    next()
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
