import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

/** 1학기 · 2학기 · 방학 — a year holds one of each semester and any number of breaks. */
export const TERM_KINDS = ['first', 'second', 'break'] as const
export type TermKind = (typeof TERM_KINDS)[number]

/**
 * Which break it is. Set by the admin, because institutes divide the year
 * differently — this one runs 가을방학 · 1학기 · 여름방학 · 2학기 — and the
 * name cannot be guessed from the dates. Only breaks carry one.
 */
export const BREAK_SEASONS = ['spring', 'summer', 'autumn', 'winter'] as const
export type BreakSeason = (typeof BREAK_SEASONS)[number]

/**
 * 학기 — defined by the institute, not by the calendar. When a semester runs
 * is an administrative decision that moves from year to year, so the dates
 * live in this table and everything else (which term a class belongs to, what
 * the 학사 일정 picker offers) is read from it.
 *
 * `code` is the stable key classes store: 'YYYY-1', 'YYYY-2' and 'YYYY-b1',
 * 'YYYY-b2' … for the breaks, which a year can have more than one of
 * (여름방학, 겨울방학).
 */
@Entity('academic_terms')
@Index('idx_term_code', ['code'], { unique: true })
export class AcademicTerm {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  /** '2026-1' · '2026-2' · '2026-b1' */
  @Column({ type: 'varchar', length: 20 })
  code!: string

  @Column({ type: 'int' })
  year!: number

  @Column({ type: 'varchar', length: 20, default: 'first' })
  kind!: TermKind

  /** 봄 · 여름 · 가을 · 겨울방학, for a break; null for a semester (and for breaks set up before this existed). */
  @Column({ type: 'varchar', length: 10, nullable: true })
  season!: BreakSeason | null

  /** Optional name the institute uses ('2026학년도 1학기', '여름방학' …). */
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
