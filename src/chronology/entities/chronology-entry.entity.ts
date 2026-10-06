import { Column, CreateDateColumn, DeleteDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

/**
 * 연혁 — one line of the institute's history. Institutions write these as
 * "2011. 03. 오시 1 세종학당 개원": the year always, the month usually, the
 * day rarely. So the date is kept as three columns rather than one date
 * string — a missing month is a fact about the record, not a null to guess at.
 */
@Entity('chronology_entries')
@Index('idx_chronology_order', ['year', 'month', 'day'])
export class ChronologyEntry {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'int' })
  year!: number

  @Column({ type: 'int', nullable: true })
  month!: number | null

  @Column({ type: 'int', nullable: true })
  day!: number | null

  /** What happened — one line. */
  @Column({ type: 'varchar', length: 255 })
  title!: string

  /** Optional detail under it. */
  @Column({ type: 'text', default: '' })
  description!: string

  /** Founding, accreditation, a new building — drawn larger on the timeline. */
  @Column({ type: 'boolean', default: false })
  isMilestone!: boolean

  @Column({ type: 'boolean', default: true })
  isPublished!: boolean

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date

  /**
   * Set when the admin deletes the record: it moves to 최근 삭제된 항목, is
   * hidden from every normal query, and can be restored for 30 days before
   * it is removed for good (see TrashService).
   */
  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt!: Date | null
}
