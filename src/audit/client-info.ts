import type { Request } from 'express'
import { lookup } from 'fast-geoip'
import { isIP } from 'node:net'

const plain = (ip: string) => ip.trim().replace(/^::ffff:(?=\d+\.\d+\.\d+\.\d+$)/, '')

/**
 * CLIENT_IP_HEADER names a header the host's own proxy sets to the visitor's
 * address — on Railway `x-real-ip`. It is needed there because a request
 * crosses two of Railway's proxies (the point of presence the visitor
 * reached, then the region's edge), and X-Forwarded-For ends in the first
 * one's address: with TRUST_PROXY=1 every visitor was "212.102.36.194,
 * Zurich" and shared one rate limit.
 *
 * The header is believed only from a peer on the private network (the
 * host's proxy); a request reaching the app any other way falls back to
 * `request.ip`, so nobody on the internet can choose their own address.
 */
const CLIENT_IP_HEADER = process.env.CLIENT_IP_HEADER?.trim().toLowerCase() || null

/**
 * The client's address: CLIENT_IP_HEADER when set and sent by the host's
 * proxy, else `request.ip`, which follows X-Forwarded-For through the
 * proxies Express trusts (TRUST_PROXY in main.ts) and no further. An IPv4
 * client seen over IPv6 (`::ffff:1.2.3.4`) is written as plain IPv4.
 */
export function clientIp(request: Request): string | null {
  const peer = plain(request.socket?.remoteAddress ?? '')
  if (CLIENT_IP_HEADER && isLocalIp(peer)) {
    const value = request.headers[CLIENT_IP_HEADER]
    const fromProxy = plain(String(Array.isArray(value) ? value[0] : (value ?? '')).split(',')[0])
    if (isIP(fromProxy)) return fromProxy
  }
  const ip = plain(request.ip ?? peer)
  return isIP(ip) ? ip : null
}

/** Loopback, private, link-local and unique-local ranges: no place on a map. */
function isLocalIp(ip: string) {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split('.').map(Number)
    return (
      a === 10 ||
      a === 127 ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 169 && b === 254) ||
      (a === 100 && b >= 64 && b <= 127)
    )
  }
  const lower = ip.toLowerCase()
  return lower === '::1' || lower === '::' || /^f[cd]/.test(lower) || /^fe[89ab]/.test(lower)
}

/**
 * Country and city from an offline database (fast-geoip, GeoLite data) — the
 * address is never sent anywhere. Local addresses are skipped: the database
 * places private ranges in arbitrary countries.
 */
export async function locate(ip: string | null): Promise<{ country: string | null; city: string | null }> {
  if (!ip || isLocalIp(ip)) return { country: null, city: null }
  try {
    const found = await lookup(ip)
    return { country: found?.country || null, city: found?.city || null }
  } catch {
    return { country: null, city: null }
  }
}

const BROWSERS: [RegExp, string][] = [
  [/YaBrowser\/(\d+)/, 'Yandex'],
  [/Edg(?:e|A|iOS)?\/(\d+)/, 'Edge'],
  [/OPR\/(\d+)/, 'Opera'],
  [/SamsungBrowser\/(\d+)/, 'Samsung Internet'],
  [/Whale\/(\d+)/, 'Whale'],
  [/Firefox\/(\d+)|FxiOS\/(\d+)/, 'Firefox'],
  [/Chrome\/(\d+)|CriOS\/(\d+)/, 'Chrome'],
  [/Version\/(\d+)[\d.]* (?:Mobile\/\S+ )?Safari/, 'Safari'],
]

const SYSTEMS: [RegExp, string][] = [
  [/iPhone|iPad|iPod/, 'iOS'],
  [/Android/, 'Android'],
  [/Windows/, 'Windows'],
  [/Mac OS X|Macintosh/, 'macOS'],
  [/CrOS/, 'ChromeOS'],
  [/Linux/, 'Linux'],
]

/** "Edge 141 · Windows" — enough to tell one's own laptop from a stranger's phone. */
export function deviceOf(userAgent: string | undefined): string | null {
  if (!userAgent) return null
  const browser = BROWSERS.map(([pattern, name]) => {
    const match = pattern.exec(userAgent)
    return match ? `${name} ${match[1] ?? match[2] ?? ''}`.trim() : null
  }).find(Boolean)
  const system = SYSTEMS.find(([pattern]) => pattern.test(userAgent))?.[1]
  const device = [browser, system].filter(Boolean).join(' · ')
  // Scripts and tools (curl, node) say who they are in their first word.
  return (device || userAgent.split(/[\s/]/)[0] || '').slice(0, 120) || null
}
