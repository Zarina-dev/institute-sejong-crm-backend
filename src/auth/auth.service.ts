import { HttpException, HttpStatus, Injectable, Logger, OnApplicationBootstrap, UnauthorizedException } from '@nestjs/common'
import { createHmac, randomBytes, timingSafeEqual } from 'crypto'

import { AccountsService, toPublicAccount, type AccountWithSecrets } from '../accounts/accounts.service'
import type { StaffRole } from '../accounts/entities/staff-account.entity'
import { burnPasswordCheck, normalizeUsername, verifyPassword } from '../accounts/passwords'

export type AuthRole = StaffRole

/** The signed-in account of a request — read from the database, not from the token. */
export type AuthUser = {
  id: string
  username: string
  fullName: string
  role: AuthRole
  /** Token expiry, Unix seconds. */
  exp: number
}

/** What a token carries. Only `sub` and `ver` are trusted; the rest is read fresh per request. */
type TokenPayload = {
  sub: string
  /** The account's token_version when the token was issued. */
  ver: number
  exp: number
}

const TOKEN_TTL_SECONDS = 12 * 60 * 60

/** Wrong passwords allowed from one address before it has to wait. */
const MAX_FAILURES_PER_ADDRESS = 5
/** Wrong passwords allowed for one username, from anywhere, before it has to wait. */
const MAX_FAILURES_PER_USERNAME = 10
/** How long the failures are remembered, and how long the wait is. */
const LOCKOUT_MS = 15 * 60 * 1000

/**
 * Stateless bearer tokens (HMAC-SHA256 over a base64url JSON payload — a
 * minimal JWT without the header), signed with `AUTH_SECRET`; without it a
 * random one is made at start (never a fixed default, which would let
 * anyone sign their own token).
 *
 * Accounts live in `staff_accounts`. A token names its account and the
 * account's token version; every request that carries one is checked
 * against the row, so a deactivated account, a changed password or a
 * sign-out ends the session at the next request, and a role change takes
 * effect at once.
 *
 * Sign-in is limited per address (5 wrong passwords in 15 minutes) and per
 * username (10, from anywhere): past that the address or the username waits
 * out the rest of the 15 minutes. Kept in memory: a restart forgets it.
 */
@Injectable()
export class AuthService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AuthService.name)
  private readonly secret: string

  constructor(private readonly accounts: AccountsService) {
    const secret = process.env.AUTH_SECRET?.trim()
    if (secret) {
      this.secret = secret
    } else {
      // No secret configured: sign with a random one made at start. Nobody
      // can guess it, so no one can forge a token, but every restart signs
      // everyone out — set AUTH_SECRET to keep sessions across restarts.
      this.secret = randomBytes(32).toString('hex')
      this.logger.warn(
        'AUTH_SECRET is not set — using a random secret for this run; everyone is signed out on every restart. Set AUTH_SECRET in the environment.',
      )
    }
  }

  /** Says at start why nobody can sign in, rather than leaving the login form to say "wrong password". */
  async onApplicationBootstrap() {
    if (process.env.ADMIN_USERNAME || process.env.ADMIN_PASSWORD) {
      this.logger.warn('ADMIN_USERNAME / ADMIN_PASSWORD are no longer read — accounts live in the database. Remove them from the environment.')
    }
    try {
      if ((await this.accounts.countActiveAdmins()) === 0) {
        this.logger.error('There is no active administrator account — nobody can manage accounts. Create one: npm run admin:create -- --username <name>')
      }
    } catch {
      // The database is not reachable; TypeORM reports that itself.
    }
  }

  /** Wrong passwords per address (`ip:…`) and per username (`user:…`): how many, and since when. */
  private readonly failures = new Map<string, { count: number; since: number }>()

  async login(username: string, password: string, ip: string | null) {
    const now = Date.now()
    const keys: Array<[string, number]> = [
      [`ip:${ip ?? 'unknown'}`, MAX_FAILURES_PER_ADDRESS],
      [`user:${normalizeUsername(username)}`, MAX_FAILURES_PER_USERNAME],
    ]

    for (const [key, limit] of keys) {
      const record = this.failures.get(key)
      if (record && now - record.since > LOCKOUT_MS) {
        this.failures.delete(key)
      } else if (record && record.count >= limit) {
        throw new HttpException('errors.login.tooMany', HttpStatus.TOO_MANY_REQUESTS)
      }
    }

    const account = await this.accounts.findForLogin(username)
    // An unknown username still costs a password check, so the answer takes
    // as long either way; an inactive account is refused only after its
    // check. One message for all three: nothing tells which it was.
    const valid = account ? await verifyPassword(account.passwordHash, password) : (await burnPasswordCheck(password), false)

    if (!account || !valid || !account.isActive) {
      for (const [key] of keys) this.noteFailure(key, now)
      throw new UnauthorizedException('errors.login.invalid')
    }

    this.failures.delete(keys[0][0])
    this.failures.delete(keys[1][0])
    await this.accounts.recordLogin(account.id)
    return this.session(account)
  }

  /** Ends every session of the account, this one included. */
  async logout(user: AuthUser) {
    await this.accounts.revokeTokens(user.id)
  }

  /** A token and the account it is for — the answer to a sign-in or a password change. */
  session(account: AccountWithSecrets) {
    return { token: this.sign(account.id, account.tokenVersion), user: toPublicAccount(account) }
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

  private sign(sub: string, ver: number): string {
    const payload: TokenPayload = { sub, ver, exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS }
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
    return `${body}.${this.signature(body)}`
  }

  /**
   * The account for a valid, unexpired token whose account is still active
   * and has not revoked it since; null otherwise. Tokens from before
   * accounts lived in the database carry no `sub` and are refused.
   */
  async authenticate(token: string | undefined): Promise<AuthUser | null> {
    const payload = this.verify(token)
    if (!payload) return null

    const account = await this.accounts.findWithSecrets(payload.sub)
    if (!account || !account.isActive || account.tokenVersion !== payload.ver) return null

    return { id: account.id, username: account.username, fullName: account.fullName, role: account.role, exp: payload.exp }
  }

  private verify(token: string | undefined): TokenPayload | null {
    if (!token) {
      return null
    }

    const [body, signature] = token.split('.')

    if (!body || !signature || !this.safeEqual(signature, this.signature(body))) {
      return null
    }

    try {
      const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as Partial<TokenPayload>
      const fresh = typeof payload.exp === 'number' && payload.exp > Math.floor(Date.now() / 1000)
      const uuid = typeof payload.sub === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(payload.sub)
      return fresh && uuid && Number.isInteger(payload.ver) ? (payload as TokenPayload) : null
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
