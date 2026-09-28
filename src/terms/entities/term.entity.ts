import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

/**
 * 학기 — defined by the institute, not by the calendar. When a semester runs
 * is an administrative decision that moves from year to year, so the dates
 * live in this table and everything else (which term a course belongs to,
 * what the 학사 일정 picker offers) is read from it.
 *
 * `code` is the stable key courses store: 'YYYY-1' for the first semester of
 * that academic year, 'YYYY-2' for the second.
 */
@Entity('academic_terms')
@Index('idx_term_code', ['code'], { unique: true })
export class AcademicTerm {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  /** '2026-1' · '2026-2' */
  @Column({ type: 'varchar', length: 20 })
  code!: string

  @Column({ type: 'int' })
  year!: number

  /** 1 = 1학기, 2 = 2학기. */
  @Column({ type: 'int' })
  half!: number

  /** Optional name the institute uses ('2026학년도 1학기', '가을학기' …). */
  @Column({ type: 'varchar', length: 120, default: '' })
  name!: string

  @Column({ type: 'varchar', length: 20 })
  startDate!: string

  @Column({ type: 'varchar', length: 20 })
  endDate!: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date
}
