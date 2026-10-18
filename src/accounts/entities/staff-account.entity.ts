import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm'

export const STAFF_ROLES = ['ADMIN', 'STAFF'] as const
export type StaffRole = (typeof STAFF_ROLES)[number]

/**
 * Someone who signs in to the admin panel. Not the same as StaffMember
 * (staff_members), which is a person shown on the public 교직원 page: an
 * account is a login, a staff member is content.
 *
 * ADMIN manages accounts, reads 작업 기록 and empties the trash; STAFF edits
 * the site. The password is kept only as an argon2id hash and never leaves
 * the API — the column is not selected unless asked for (`select: false`).
 */
@Entity('staff_accounts')
@Unique('uq_staff_accounts_username', ['username'])
export class StaffAccount {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  /** Lower-case, trimmed — what is typed at sign-in. Unique (`uq_staff_accounts_username`). */
  @Column({ type: 'varchar', length: 64 })
  username!: string

  @Column({ name: 'password_hash', type: 'varchar', length: 255, select: false })
  passwordHash!: string

  @Column({ name: 'full_name', type: 'varchar', length: 120, default: '' })
  fullName!: string

  // Postgres type "staff_accounts_role_enum" — TypeORM's default name, so not spelled out (spelling it out reads as a change).
  @Column({ type: 'enum', enum: STAFF_ROLES, default: 'STAFF' })
  role!: StaffRole

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean

  /**
   * Part of every token this account is issued. Raising it — on sign-out,
   * a password change, deactivation — makes every token issued before
   * worthless at once, without a sessions table.
   */
  @Column({ name: 'token_version', type: 'int', default: 0, select: false })
  tokenVersion!: number

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date

  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true })
  lastLoginAt!: Date | null
}
