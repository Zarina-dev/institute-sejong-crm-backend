import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

/** What happened. `login_failed` is a sign-in refused — worth seeing when it repeats. */
export const AUDIT_ACTIONS = ['create', 'update', 'publish', 'unpublish', 'reorder', 'delete', 'restore', 'purge', 'login', 'login_failed'] as const
export type AuditAction = (typeof AUDIT_ACTIONS)[number]

/**
 * 작업 기록 — one change made through the admin panel (or by the system, as
 * the 30-day purge). A record of who did what, for people; technical logs
 * stay in the server's output. Field *names* are kept, never their values:
 * the journal must not become a second copy of every text and photo.
 */
@Entity('audit_log')
@Index('idx_audit_at', ['at'])
@Index('idx_audit_entity', ['entityType', 'entityId'])
export class AuditLogEntry {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @CreateDateColumn({ name: 'at', type: 'timestamptz' })
  at!: Date

  /** The admin's username, the one typed at a failed sign-in, or "system". */
  @Column({ type: 'varchar', length: 120 })
  actor!: string

  @Column({ type: 'varchar', length: 20 })
  action!: AuditAction

  /** courses, news, terms … — the same names as 최근 삭제된 항목; null for sign-ins. */
  @Column({ name: 'entity_type', type: 'varchar', length: 40, nullable: true })
  entityType!: string | null

  /** The record's id (or a content block's slug/locale); null for a reorder or a sign-in. */
  @Column({ name: 'entity_id', type: 'varchar', length: 80, nullable: true })
  entityId!: string | null

  /** The record's name when it happened — it may be renamed or gone since. */
  @Column({ type: 'varchar', length: 300, default: '' })
  label!: string

  /** Fields an update sent (names only). */
  @Column({ type: 'jsonb', default: [] })
  changes!: string[]

  @Column({ type: 'varchar', length: 64, nullable: true })
  ip!: string | null
}
