import { Logger } from '@nestjs/common'
import Redis from 'ioredis'

import { etagMatches, pick, type CachedEntry, type Encoding } from './cache.entry'

/** What a lookup found: the entry in the form asked for, or only its validator when the client already has it. */
export type CacheHit = { etag: string; encoding: Encoding | 'not-modified'; body: Buffer | null }

/** A cached response, and the generation it was read under (a write must use the same one). */
export type CacheRead = { generation: string; hit: CacheHit | null }

/**
 * Where cached responses live. Invalidation is by generation: every entry's
 * key carries the generation it was written under, and a change anywhere
 * moves the generation on — every older entry is then simply never read
 * again and expires by its TTL. No key lists, no patterns, no SCAN.
 */
export interface CacheStore {
  readonly kind: 'redis' | 'memory'
  /**
   * The current generation and the entry for `key` under it, in one step.
   * `wanted` is the encoding the client accepts; when `ifNoneMatch` already
   * names the entry, the hit carries no body (a 304).
   */
  read(key: string, wanted: Encoding, ifNoneMatch: string): Promise<CacheRead>
  write(generation: string, key: string, entry: CachedEntry, ttlSeconds: number): Promise<void>
  /** Retires every entry at once. */
  bump(): Promise<void>
  healthy(): boolean
  close(): Promise<void>
}

const GENERATION_KEY = 'cache:gen'
/**
 * `v2`: an entry is a hash of ready-made encodings now. A different prefix
 * keeps a release still running the old code (strings under `cache:<gen>:`)
 * and this one from overwriting each other's keys during a rolling deploy.
 */
const entryKey = (generation: string, key: string) => `cache:v2:${generation}:${key}`

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
 *
 * An entry is a hash: `e` the ETag, `i` / `g` / `b` the body as is, gzipped
 * and brotli-compressed. Only the form the client accepts (ARGV[3]) leaves
 * Redis, and none at all when ARGV[4] (If-None-Match) already names the ETag.
 * Answers: { generation } on a miss, { generation, etag, '304' }, or
 * { generation, etag, field, body }.
 */
const READ_SCRIPT = `
local generation = redis.call('GET', KEYS[1])
if not generation then
  generation = ARGV[2]
  redis.call('SET', KEYS[1], generation)
end
local v = redis.call('HMGET', 'cache:v2:' .. generation .. ':' .. ARGV[1], 'e', ARGV[3], 'i')
if not v[1] then return { generation } end
if ARGV[4] ~= '' and string.find(ARGV[4], v[1], 1, true) then return { generation, v[1], '304' } end
if v[2] then return { generation, v[1], ARGV[3], v[2] } end
return { generation, v[1], 'i', v[3] }
`

const FIELD: Record<Encoding, 'i' | 'g' | 'b'> = { identity: 'i', gzip: 'g', br: 'b' }
const ENCODING: Record<string, Encoding> = { i: 'identity', g: 'gzip', b: 'br' }

type CachingRedis = Redis & {
  cacheReadBuffer(generationKey: string, key: string, fresh: string, field: string, ifNoneMatch: string): Promise<Buffer[]>
}

/** A command that takes longer is given up on: the request goes to the database instead of waiting. */
const COMMAND_TIMEOUT_MS = 400
/** After a timeout the cache is skipped for this long, so a stalled Redis costs one slow request, not every one. */
const COOLDOWN_MS = 5000

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
  private pausedUntil = 0

  constructor(url: string) {
    this.client = new Redis(url, {
      // Railway's private network is IPv6; family 0 resolves either.
      family: 0,
      connectTimeout: 2000,
      // Without it a Redis that accepts the connection and then stalls (a
      // failover, a blocked server) would hold every request until TCP gives up.
      commandTimeout: COMMAND_TIMEOUT_MS,
      // Keeps the idle connection alive, so the first request after a quiet
      // spell does not meet a socket the network has silently dropped.
      keepAlive: 10_000,
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
          this.pausedUntil = 0
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

  /** Usable: connected and not in the cool-down that follows a timed-out command. */
  private usable() {
    return this.up && Date.now() >= this.pausedUntil
  }

  /** A command that timed out pauses the cache; any other failure fails just that request. */
  private failed(err: Error): never {
    if (/timed out/i.test(err.message)) this.pausedUntil = Date.now() + COOLDOWN_MS
    throw err
  }

  async read(key: string, wanted: Encoding, ifNoneMatch: string): Promise<CacheRead> {
    if (!this.usable()) return { generation: '', hit: null }
    // The Buffer variant of the command: bodies are bytes, not text.
    const reply = await this.client.cacheReadBuffer(GENERATION_KEY, key, newGeneration(), FIELD[wanted], ifNoneMatch).catch((err: Error) => this.failed(err))
    const generation = reply[0].toString()
    if (!reply[1]) return { generation, hit: null }
    const etag = reply[1].toString()
    const field = reply[2].toString()
    if (field === '304') return { generation, hit: { etag, encoding: 'not-modified', body: null } }
    return { generation, hit: { etag, encoding: ENCODING[field], body: reply[3] } }
  }

  async write(generation: string, key: string, entry: CachedEntry, ttlSeconds: number) {
    if (!this.usable() || !generation) return
    const name = entryKey(generation, key)
    const fields: Array<string | Buffer> = ['e', entry.etag, 'i', entry.identity]
    if (entry.gzip) fields.push('g', entry.gzip)
    if (entry.br) fields.push('b', entry.br)
    // One transaction: an entry never exists without its expiry.
    await this.client
      .multi()
      .hset(name, ...fields)
      .expire(name, ttlSeconds)
      .exec()
      .catch((err: Error) => this.failed(err))
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
  private readonly entries = new Map<string, { entry: CachedEntry; expires: number }>()

  async read(key: string, wanted: Encoding, ifNoneMatch: string): Promise<CacheRead> {
    const generation = String(this.generation)
    const found = this.entries.get(entryKey(generation, key))
    if (!found || found.expires < Date.now()) return { generation, hit: null }
    const { entry } = found
    if (etagMatches(ifNoneMatch, entry.etag)) return { generation, hit: { etag: entry.etag, encoding: 'not-modified', body: null } }
    const { encoding, body } = pick(entry, wanted)
    return { generation, hit: { etag: entry.etag, encoding, body } }
  }

  async write(generation: string, key: string, entry: CachedEntry, ttlSeconds: number) {
    if (generation !== String(this.generation)) return
    if (this.entries.size >= MemoryStore.MAX_ENTRIES) {
      this.entries.delete(this.entries.keys().next().value as string)
    }
    this.entries.set(entryKey(generation, key), { entry, expires: Date.now() + ttlSeconds * 1000 })
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
