import { Column, CreateDateColumn, DeleteDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

/** A teacher or administrator shown on the About page. */
@Entity('staff_members')
@Index('idx_staff_order', ['isPublished', 'sortOrder'])
export class StaffMember {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'varchar', length: 120 })
  name!: string

  @Column({ type: 'varchar', length: 160 })
  position!: string

  @Column({ type: 'text', default: '' })
  bio!: string

  /** Site-relative `/uploads/images/…` URL from `POST /uploads/images`. */
  @Column({ type: 'varchar', length: 500, nullable: true })
  photoUrl!: string | null

  @Column({ type: 'varchar', length: 255, nullable: true })
  email!: string | null

  /** Lower comes first; ties broken by name. */
  @Column({ type: 'int', default: 0 })
  sortOrder!: number

  /**
   * 근무 시작일 · 퇴직일 (ISO dates). Whether someone works here is read off
   * these rather than switched by hand: a start in the future is 입사 예정,
   * an end in the past is 퇴직, anything else 재직 중 — so nobody has to
   * remember to flip a switch on someone's first or last day. Not the same
   * as isPublished: a teacher who has left stays on the page, marked so.
   */
  @Column({ type: 'varchar', length: 10, nullable: true })
  startDate!: string | null

  @Column({ type: 'varchar', length: 10, nullable: true })
  endDate!: string | null

  /**
   * Superseded by the dates. Kept only so the one-time backfill can still
   * read who had been marked as former before the dates existed; nothing
   * else uses it, and it can go once every row has a start date.
   */
  @Column({ type: 'boolean', default: true })
  isCurrent!: boolean

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
