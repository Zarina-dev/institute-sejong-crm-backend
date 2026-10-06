import { Column, CreateDateColumn, DeleteDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

/**
 * 행사 일정 — the semester's events as the institute publishes them: one row
 * per event, with the name in Korean **and** in Kyrgyz, because the printed
 * table carries both columns side by side.
 *
 * The month, the day and the weekday are not stored: they are read off the
 * dates, so "9–13" and "월–금" can never disagree with them.
 */
@Entity('schedule_events')
@Index('idx_event_term', ['termCode', 'startDate'])
export class ScheduleEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  /** '2026-2' — which semester's table this belongs to. */
  @Column({ type: 'varchar', length: 20, nullable: true })
  termCode!: string | null

  @Column({ type: 'varchar', length: 20 })
  startDate!: string

  /** Set only for events that run over several days (9–13). */
  @Column({ type: 'varchar', length: 20, nullable: true })
  endDate!: string | null

  /** 행사명 */
  @Column({ type: 'varchar', length: 255 })
  title!: string

  /** Иш-чаранын аталышы */
  @Column({ type: 'varchar', length: 255, default: '' })
  titleKy!: string

  @Column({ type: 'varchar', length: 255, default: '' })
  titleRu!: string

  @Column({ type: 'varchar', length: 255, default: '' })
  titleEn!: string

  /** 장소, 대상 등 — shown under the name where it is set. */
  @Column({ type: 'varchar', length: 255, default: '' })
  note!: string

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
