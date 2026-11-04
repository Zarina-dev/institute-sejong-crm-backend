import { createHash } from 'crypto'
import { brotliCompress, constants, gzip } from 'zlib'
import { promisify } from 'util'

const gzipAsync = promisify(gzip)
const brotliAsync = promisify(brotliCompress)

/** How a stored answer can leave: as is, or already compressed. */
export type Encoding = 'br' | 'gzip' | 'identity'

/**
 * A cached answer, ready to send. It is compressed once, when it is written,
 * so a hit is a copy of bytes — not a gzip of the whole body per request
 * (compression of the 175 kB competitions list costs several ms of CPU).
 */
export type CachedEntry = {
  /** `"<hash of the body>"`, computed once; sent as a weak validator (`W/`) since the bytes differ per encoding. */
  etag: string
  identity: Buffer
  /** Absent for bodies too small to be worth compressing. */
  gzip?: Buffer
  br?: Buffer
}

/** Below this, compressing costs more than it saves (the same threshold `compression` uses in main.ts). */
const MIN_COMPRESS = 1024

export const etagOf = (body: string) => `"${createHash('sha1').update(body).digest('base64url')}"`

/**
 * Whether an `If-None-Match` header names this entry. A plain substring test
 * of the quoted hash covers `W/"…"` and lists, and is the same test the
 * Redis script makes — so a 304 never needs the body to leave Redis.
 */
export const etagMatches = (ifNoneMatch: string, etag: string) => ifNoneMatch !== '' && ifNoneMatch.includes(etag)

/**
 * Compresses off the event loop (zlib's thread pool). Brotli at quality 5 is
 * ~20% smaller than gzip for JSON and still fast; it is paid once per write.
 */
export async function encodeEntry(body: string, etag = etagOf(body)): Promise<CachedEntry> {
  const identity = Buffer.from(body, 'utf8')
  if (identity.length < MIN_COMPRESS) return { etag, identity }
  const [gz, br] = await Promise.all([
    gzipAsync(identity, { level: 6 }),
    brotliAsync(identity, {
      params: { [constants.BROTLI_PARAM_QUALITY]: 5, [constants.BROTLI_PARAM_SIZE_HINT]: identity.length },
    }),
  ])
  return { etag, identity, gzip: gz, br }
}

/** The stored form closest to what the client accepts. */
export function pick(entry: CachedEntry, wanted: Encoding): { encoding: Encoding; body: Buffer } {
  if (wanted === 'br' && entry.br) return { encoding: 'br', body: entry.br }
  if (wanted !== 'identity' && entry.gzip) return { encoding: 'gzip', body: entry.gzip }
  return { encoding: 'identity', body: entry.identity }
}
