import { Injectable, Logger, UnauthorizedException } from '@nestjs/common'
import { createHmac, timingSafeEqual } from 'crypto'

import { StudentsService } from '../students/students.service'

export type AuthRole = 'admin' | 'student'

export type AuthUser = {
  role: AuthRole
  /** Admin username or the student's login id. */
  username: string
  /** Student row id; absent for the admin. */
  studentId?: string
  /** Unix seconds. */
  exp: number
}

const TOKEN_TTL_SECONDS = 12 * 60 * 60
const DEV_SECRET = 'institut-dev-secret-change-me'

/**
 * Stateless bearer tokens (HMAC-SHA256 over a base64url JSON payload — a
 * minimal JWT without the header). One signing secret, no sessions table;
 * a token is valid until it expires or the secret changes. The secret must
 * be set in production (`AUTH_SECRET`); the dev fallback is logged loudly.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)
  private readonly secret: string
  private readonly adminUsername = process.env.ADMIN_USERNAME || 'admin'
  private readonly adminPassword = process.env.ADMIN_PASSWORD || 'admin123'

  constructor(private readonly studentsService: StudentsService) {
    this.secret = process.env.AUTH_SECRET || DEV_SECRET

    if (this.secret === DEV_SECRET) {
      this.logger.warn('AUTH_SECRET is not set — using the development secret. Set it before deploying.')
    }
  }

  /** Admin first (env credentials), then students (database). */
  async login(username: string, password: string) {
    if (username === this.adminUsername) {
      if (!this.safeEqual(password, this.adminPassword)) {
        throw new UnauthorizedException('errors.login.invalid')
      }

      return { role: 'admin' as const, token: this.sign({ role: 'admin', username }), student: null }
    }

    const { student } = await this.studentsService.login(username, password)

    return {
      role: 'student' as const,
      token: this.sign({ role: 'student', username: student.studentId, studentId: student.id }),
      student,
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
