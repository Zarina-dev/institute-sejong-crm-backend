import { HttpException, HttpStatus, Injectable, Logger, UnauthorizedException } from '@nestjs/common'
import { createHmac, timingSafeEqual } from 'crypto'

export type AuthRole = 'admin'

export type AuthUser = {
  role: AuthRole
  username: string
  /** Unix seconds. */
  exp: number
}

const TOKEN_TTL_SECONDS = 12 * 60 * 60

/** Wrong passwords allowed from one address before it has to wait. */
const MAX_FAILURES = 5
/** How long the failures are remembered, and how long the wait is. */
const LOCKOUT_MS = 15 * 60 * 1000

/**
 * Stateless bearer tokens (HMAC-SHA256 over a base64url JSON payload — a
 * minimal JWT without the header). One signing secret, no sessions table;
 * a token is valid until it expires or the secret changes. The secret must
 * be set (`AUTH_SECRET`): without it the API does not start, since a known
 * secret would let anyone sign their own admin token.
 *
 * Sign-in is limited per address: after 5 wrong passwords in
 * 15 minutes the address waits out the rest of them, so a password cannot be
 * guessed by trying a dictionary. Kept in memory: a restart forgets it.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)
  private readonly secret: string
  private readonly adminUsername = process.env.ADMIN_USERNAME
  private readonly adminPassword = process.env.ADMIN_PASSWORD

  constructor() {
    const secret = process.env.AUTH_SECRET?.trim()
    if (!secret) {
      throw new Error(
        'AUTH_SECRET is not set. Put a long random value in backend/.env (e.g. node -e "console.log(crypto.randomBytes(32).toString(\'hex\'))").',
      )
    }
    this.secret = secret

    // There is no built-in account: without these nobody can sign in, and
    // the login form would only say "wrong password". Say why, at start.
    if (!this.adminUsername || !this.adminPassword) {
      this.logger.error('ADMIN_USERNAME and ADMIN_PASSWORD are not set — the admin panel cannot be signed in to. Set them in backend/.env.')
    }
  }

  /** Wrong passwords per address: how many, and since when. */
  private readonly failures = new Map<string, { count: number; since: number }>()

  /** The site has one account: the administrator, from the environment. */
  login(username: string, password: string, ip: string | null) {
    const { adminUsername, adminPassword } = this
    const key = ip ?? 'unknown'
    const now = Date.now()
    const record = this.failures.get(key)

    if (record && now - record.since > LOCKOUT_MS) {
      this.failures.delete(key)
    } else if (record && record.count >= MAX_FAILURES) {
      throw new HttpException('errors.login.tooMany', HttpStatus.TOO_MANY_REQUESTS)
    }

    // No account configured: nobody signs in (see the error logged at start).
    if (!adminUsername || !adminPassword || username !== adminUsername || !this.safeEqual(password, adminPassword)) {
      this.noteFailure(key, now)
      throw new UnauthorizedException('errors.login.invalid')
    }

    this.failures.delete(key)
    return { role: 'admin' as const, token: this.sign({ role: 'admin', username }) }
  }

  private noteFailure(key: string, now: number) {
    const record = this.failures.get(key)
    this.failures.set(key, record ? { ...record, count: record.count + 1 } : { count: 1, since: now })

    // Many addresses trying at once: forget the ones whose time is up.
    if (this.failures.size > 1000) {
      for (const [address, { since }] of this.failures) {
        if (now - since > LOCKOUT_MS) this.failures.delete(address)
      }
    }
  }

  sign(payload: Omit<AuthUser, 'exp'>): string {
    const body = Buffer.from(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS })).toString('base64url')
    return `${body}.${this.signature(body)}`
  }

  /** Returns the user for a valid, unexpired token; null otherwise. */
  verify(token: string | undefined): AuthUser | null {
    if (!token) {
      return null
    }

    const [body, signature] = token.split('.')

    if (!body || !signature || !this.safeEqual(signature, this.signature(body))) {
      return null
    }

    try {
      const user = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as AuthUser
      return user.exp > Math.floor(Date.now() / 1000) ? user : null
    } catch {
      return null
    }
  }

  private signature(body: string) {
    return createHmac('sha256', this.secret).update(body).digest('base64url')
  }

  private safeEqual(a: string, b: string) {
    const left = Buffer.from(a)
    const right = Buffer.from(b)
    return left.length === right.length && timingSafeEqual(left, right)
  }
}
