import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Brackets, DataSource, QueryFailedError, Repository, type EntityManager } from 'typeorm'

import type { AuthUser } from '../auth/auth.service'
import type { ChangePasswordDto, CreateAccountDto, ListAccountsQuery, UpdateAccountDto } from './dto/account.dto'
import { StaffAccount } from './entities/staff-account.entity'
import { hashPassword, normalizeUsername, verifyPassword } from './passwords'

/** What the API ever says about an account — never the hash, never the token version. */
export type PublicAccount = Pick<StaffAccount, 'id' | 'username' | 'fullName' | 'role' | 'isActive' | 'createdAt' | 'updatedAt' | 'lastLoginAt'>

/** An account with the columns sign-in and token checks need (both `select: false`). */
export type AccountWithSecrets = StaffAccount

const DEFAULT_PAGE_SIZE = 20

export const toPublicAccount = ({ id, username, fullName, role, isActive, createdAt, updatedAt, lastLoginAt }: StaffAccount): PublicAccount => ({
  id,
  username,
  fullName,
  role,
  isActive,
  createdAt,
  updatedAt,
  lastLoginAt,
})

/** Postgres unique_violation. */
const isUniqueViolation = (error: unknown) => error instanceof QueryFailedError && (error.driverError as { code?: string })?.code === '23505'

/**
 * Accounts for the admin panel. Every change that could leave the site
 * without an administrator — demoting, deactivating or deleting one — runs
 * under one advisory lock and counts the active administrators inside it,
 * so two such changes at once cannot both pass the check.
 */
@Injectable()
export class AccountsService {
  constructor(
    @InjectRepository(StaffAccount) private readonly accounts: Repository<StaffAccount>,
    private readonly dataSource: DataSource,
  ) {}

  async list({ q, page = 1, pageSize = DEFAULT_PAGE_SIZE }: ListAccountsQuery) {
    const query = this.accounts.createQueryBuilder('account').orderBy('account.createdAt', 'ASC').addOrderBy('account.id', 'ASC')
    const search = q?.trim()

    if (search) {
      // A dozen rows at most in practice: a scan is cheaper than any index.
      const pattern = `%${search.replace(/[\\%_]/g, (character) => `\\${character}`)}%`
      query.where(
        new Brackets((where) => where.where('account.username ILIKE :pattern', { pattern }).orWhere('account.fullName ILIKE :pattern', { pattern })),
      )
    }

    const [rows, total] = await query
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount()
    return { items: rows.map(toPublicAccount), total, page, pageSize }
  }

  async getById(id: string): Promise<PublicAccount> {
    return toPublicAccount(await this.find(id))
  }

  async create(body: CreateAccountDto): Promise<PublicAccount> {
    const username = normalizeUsername(body.username)

    if (await this.accounts.exists({ where: { username } })) {
      throw new ConflictException('errors.account.usernameTaken')
    }

    try {
      const saved = await this.accounts.save(
        this.accounts.create({
          username,
          passwordHash: await hashPassword(body.password),
          fullName: body.fullName?.trim() ?? '',
          role: body.role ?? 'STAFF',
          isActive: true,
        }),
      )
      return this.getById(saved.id)
    } catch (error) {
      // Two people adding the same username at the same moment.
      if (isUniqueViolation(error)) throw new ConflictException('errors.account.usernameTaken')
      throw error
    }
  }

  async update(actor: AuthUser, id: string, body: UpdateAccountDto): Promise<PublicAccount> {
    return this.withAdminLock(async (manager) => {
      const account = await this.find(id, manager)
      const patch: Partial<StaffAccount> = {}

      if (body.fullName !== undefined) patch.fullName = body.fullName.trim()

      if (body.role !== undefined && body.role !== account.role) {
        // Demoting oneself is how the last administrator locks everyone out.
        if (account.id === actor.id) throw new ForbiddenException('errors.account.selfRole')
        if (account.role === 'ADMIN' && account.isActive) await this.ensureAnotherAdmin(manager, account.id)
        patch.role = body.role
      }

      if (Object.keys(patch).length > 0) await manager.update(StaffAccount, account.id, patch)
      return toPublicAccount(await this.find(id, manager))
    })
  }

  /** Deactivating also ends every session the account has open. */
  async setStatus(actor: AuthUser, id: string, isActive: boolean): Promise<PublicAccount> {
    return this.withAdminLock(async (manager) => {
      const account = await this.find(id, manager)

      if (account.isActive === isActive) return toPublicAccount(account)
      if (account.id === actor.id) throw new ForbiddenException('errors.account.selfStatus')
      if (!isActive && account.role === 'ADMIN') await this.ensureAnotherAdmin(manager, account.id)

      await manager.update(StaffAccount, account.id, { isActive })
      if (!isActive) await manager.increment(StaffAccount, { id: account.id }, 'tokenVersion', 1)
      return toPublicAccount(await this.find(id, manager))
    })
  }

  /**
   * Anyone may change their own password, giving the current one; an
   * administrator may set anyone else's without it. Every session the
   * account had is ended — the caller issues a fresh token for its own.
   */
  async changePassword(actor: AuthUser, id: string, body: ChangePasswordDto): Promise<AccountWithSecrets> {
    const self = actor.id === id

    if (!self && actor.role !== 'ADMIN') throw new ForbiddenException('errors.auth.forbidden')

    const account = await this.findWithSecrets(id)
    if (!account) throw new NotFoundException('errors.account.notFound')

    if (self) {
      if (!body.currentPassword) throw new BadRequestException('errors.account.currentPasswordRequired')
      if (!(await verifyPassword(account.passwordHash, body.currentPassword))) {
        throw new BadRequestException('errors.account.currentPasswordWrong')
      }
    }

    const passwordHash = await hashPassword(body.password)
    await this.accounts
      .createQueryBuilder()
      .update()
      .set({ passwordHash, tokenVersion: () => '"token_version" + 1' })
      .where('id = :id', { id: account.id })
      .execute()
    return (await this.findWithSecrets(id))!
  }

  async remove(actor: AuthUser, id: string) {
    return this.withAdminLock(async (manager) => {
      const account = await this.find(id, manager)

      if (account.id === actor.id) throw new ForbiddenException('errors.account.selfDelete')
      if (account.role === 'ADMIN' && account.isActive) await this.ensureAnotherAdmin(manager, account.id)

      await manager.delete(StaffAccount, account.id)
      return { success: true, id: account.id, username: account.username }
    })
  }

  // ---- for AuthService ------------------------------------------------------

  /** By username, with the password hash and token version. Null when there is no such account. */
  findForLogin(username: string) {
    return this.accounts
      .createQueryBuilder('account')
      .addSelect(['account.passwordHash', 'account.tokenVersion'])
      .where('account.username = :username', { username: normalizeUsername(username) })
      .getOne()
  }

  /** By id, with the token version — what a request's token is checked against. */
  findWithSecrets(id: string) {
    return this.accounts
      .createQueryBuilder('account')
      .addSelect(['account.passwordHash', 'account.tokenVersion'])
      .where('account.id = :id', { id })
      .getOne()
  }

  async recordLogin(id: string) {
    // A raw update: a sign-in is not an edit of the account, so updated_at stays.
    await this.accounts.createQueryBuilder().update().set({ lastLoginAt: () => 'now()', updatedAt: () => '"updated_at"' }).where('id = :id', { id }).execute()
  }

  /** Ends every session of the account (sign-out). */
  async revokeTokens(id: string) {
    await this.accounts.createQueryBuilder().update().set({ tokenVersion: () => '"token_version" + 1', updatedAt: () => '"updated_at"' }).where('id = :id', { id }).execute()
  }

  countActiveAdmins() {
    return this.accounts.count({ where: { role: 'ADMIN', isActive: true } })
  }

  // ---- helpers --------------------------------------------------------------

  private async find(id: string, manager: EntityManager = this.accounts.manager) {
    const account = await manager.findOne(StaffAccount, { where: { id } })
    if (!account) throw new NotFoundException('errors.account.notFound')
    return account
  }

  /** Refuses the change when `leaving` is the last active administrator. */
  private async ensureAnotherAdmin(manager: EntityManager, leaving: string) {
    const others = await manager
      .createQueryBuilder(StaffAccount, 'account')
      .where('account.role = :role', { role: 'ADMIN' })
      .andWhere('account.isActive = true')
      .andWhere('account.id <> :leaving', { leaving })
      .getCount()

    if (others === 0) throw new ConflictException('errors.account.lastAdmin')
  }

  /** One transaction, serialised against every other change to who is an administrator. */
  private withAdminLock<T>(work: (manager: EntityManager) => Promise<T>) {
    return this.dataSource.transaction(async (manager) => {
      await manager.query(`SELECT pg_advisory_xact_lock(hashtext('staff_accounts.admins'))`)
      return work(manager)
    })
  }
}
