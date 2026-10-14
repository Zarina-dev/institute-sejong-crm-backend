import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

import type { AuditChange } from '../diff'

/** What happened. `login_failed` is a sign-in refused — worth seeing when it repeats. */
export const AUDIT_ACTIONS = ['create', 'update', 'publish', 'unpublish', 'reorder', 'delete', 'restore', 'purge', 'login', 'login_failed'] as const
export type AuditAction = (typeof AUDIT_ACTIONS)[number]

/**
 * 작업 기록 — one change made through the admin panel (or by the system, as
 * the 30-day purge). A record of who did what, for people; technical logs
 * stay in the server's output. An edit keeps each changed field's value
 * before and after, shortened (80 characters, HTML as plain text) — enough
 * to see what changed, never a second copy of every text and photo.
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

  /** What an edit changed: field, before → after (see diff.ts). Entries written before 2026-10-14 hold field names only. */
  @Column({ type: 'jsonb', default: [] })
  changes!: Array<AuditChange | string>

  /** The client's address, as the proxy in front reports it (TRUST_PROXY). */
  @Column({ type: 'varchar', length: 64, nullable: true })
  ip!: string | null

  /** ISO country code looked up from the IP when it was recorded; null for a local or unknown address. */
  @Column({ type: 'varchar', length: 2, nullable: true })
  country!: string | null

  @Column({ type: 'varchar', length: 80, nullable: true })
  city!: string | null

  /** Browser and system, read from the User-Agent: "Edge 141 · Windows". */
  @Column({ type: 'varchar', length: 120, nullable: true })
  device!: string | null
}
