import { Logger } from '@nestjs/common'
import Redis from 'ioredis'

/** A cached response, and the generation it was read under (a write must use the same one). */
export type CacheRead = { generation: string; body: string | null }

/**
 * Where cached responses live. Invalidation is by generation: every entry's
 * key carries the generation it was written under, and a change anywhere
 * moves the generation on — every older entry is then simply never read
 * again and expires by its TTL. No key lists, no patterns, no SCAN.
 */
export interface CacheStore {
  readonly kind: 'redis' | 'memory'
  /** The current generation and the entry for `key` under it, in one step. */
  read(key: string): Promise<CacheRead>
  write(generation: string, key: string, body: string, ttlSeconds: number): Promise<void>
  /** Retires every entry at once. */
  bump(): Promise<void>
  healthy(): boolean
  close(): Promise<void>
}

const GENERATION_KEY = 'cache:gen'
const entryKey = (generation: string, key: string) => `cache:${generation}:${key}`

/**
 * A generation is never a counter: one that restarts (Redis emptied, or
 * the key evicted under memory pressure) could land on an old number and
 * revive what was cached under it. Time plus randomness never repeats.
 */
const newGeneration = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`

/**
 * One round trip per lookup: the generation and the entry under it are
 * read together on the server, so a hit costs a single request (sent as
 * EVALSHA once loaded). With no generation stored, the one passed in
 * becomes current — so an evicted generation key starts a clean cache.
 */
const READ_SCRIPT = `
local generation = redis.call('GET', KEYS[1])
if not generation then
  generation = ARGV[2]
  redis.call('SET', KEYS[1], generation)
end
return { generation, redis.call('GET', 'cache:' .. generation .. ':' .. ARGV[1]) }
`

type CachingRedis = Redis & { cacheRead(generationKey: string, key: string, fresh: string): Promise<[string, string | null]> }

/**
 * Redis (Railway: REDIS_URL). Shared by every instance of the API, so a
 * change made through one is seen by all. It fails fast and quietly: with
 * Redis down a lookup is a miss and the request goes to the database as
 * if there were no cache — the site never breaks because of it.
 */
export class RedisStore implements CacheStore {
  readonly kind = 'redis'
  private readonly logger = new Logger('Cache')
  private readonly client: CachingRedis
  private up = false
  private warned = false

  constructor(url: string) {
    this.client = new Redis(url, {
      // Railway's private network is IPv6; family 0 resolves either.
      family: 0,
      connectTimeout: 2000,
      // A command is not queued while disconnected and is tried once: a
      // slow or absent Redis must not hold a request up.
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      retryStrategy: (attempt) => Math.min(attempt * 500, 5000),
    }) as CachingRedis
    this.client.defineCommand('cacheRead', { numberOfKeys: 1, lua: READ_SCRIPT })
    // On every (re)connection the cache is retired before it is used: while
    // Redis was away, edits could not retire it, and this may also be a new
    // release that answers differently.
    this.client.on('ready', () => {
      this.client
        .set(GENERATION_KEY, newGeneration())
        .then(() => {
          this.up = true
          this.warned = false
          this.logger.log('Redis connected — public responses are cached.')
        })
        .catch((err: Error) => this.logger.warn(`Redis connected but not writable (${err.message}) — serving without the cache.`))
    })
    this.client.on('error', (err: Error) => {
      // Logged once per outage, not on every reconnect attempt.
      if (!this.warned) this.logger.warn(`Redis unavailable (${err.message}) — serving without the cache.`)
      this.up = false
      this.warned = true
    })
  }

  async read(key: string): Promise<CacheRead> {
    if (!this.up) return { generation: '', body: null }
    const [generation, body] = await this.client.cacheRead(GENERATION_KEY, key, newGeneration())
    return { generation, body }
  }

  async write(generation: string, key: string, body: string, ttlSeconds: number) {
    if (!this.up || !generation) return
    await this.client.set(entryKey(generation, key), body, 'EX', ttlSeconds)
  }

  async bump() {
    if (!this.up) return
    await this.client.set(GENERATION_KEY, newGeneration())
  }

  healthy() {
    return this.up
  }

  async close() {
    await this.client.quit().catch(() => this.client.disconnect())
  }
}

/**
 * Without REDIS_URL (local development): the same behaviour inside the
 * process. Bounded — the oldest entries go first past MAX_ENTRIES.
 */
export class MemoryStore implements CacheStore {
  readonly kind = 'memory'
  private static readonly MAX_ENTRIES = 500
  private generation = 0
  private readonly entries = new Map<string, { body: string; expires: number }>()

  async read(key: string): Promise<CacheRead> {
    const generation = String(this.generation)
    const entry = this.entries.get(entryKey(generation, key))
    if (!entry || entry.expires < Date.now()) return { generation, body: null }
    return { generation, body: entry.body }
  }

  async write(generation: string, key: string, body: string, ttlSeconds: number) {
    if (generation !== String(this.generation)) return
    if (this.entries.size >= MemoryStore.MAX_ENTRIES) {
      this.entries.delete(this.entries.keys().next().value as string)
    }
    this.entries.set(entryKey(generation, key), { body, expires: Date.now() + ttlSeconds * 1000 })
  }

  async bump() {
    this.generation += 1
    this.entries.clear()
  }

  healthy() {
    return true
  }

  async close() {}
}
