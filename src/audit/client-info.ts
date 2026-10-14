import type { Request } from 'express'
import { lookup } from 'fast-geoip'
import { isIP } from 'node:net'

/**
 * The client's address. `request.ip` already follows X-Forwarded-For through
 * the proxies Express trusts (TRUST_PROXY in main.ts) and no further, so a
 * forged header from the internet is ignored. An IPv4 client seen over IPv6
 * (`::ffff:1.2.3.4`) is written as plain IPv4.
 */
export function clientIp(request: Request): string | null {
  const ip = (request.ip ?? request.socket?.remoteAddress ?? '').replace(/^::ffff:(?=\d+\.\d+\.\d+\.\d+$)/, '')
  return isIP(ip) ? ip : null
}

/** Loopback, private, link-local and unique-local ranges: no place on a map. */
export function isLocalIp(ip: string) {
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
