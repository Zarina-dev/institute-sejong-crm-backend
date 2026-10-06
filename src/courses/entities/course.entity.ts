import { Column, CreateDateColumn, DeleteDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

/** ISO weekday: 1 = Monday … 7 = Sunday. Times are HH:mm. */
export type CourseSession = {
  weekday: 1 | 2 | 3 | 4 | 5 | 6 | 7
  startTime: string
  endTime: string
  classroom?: string | null
}

export type CourseCategory = 'language' | 'culture'

@Entity('courses')
// Every list reads one semester of one category; history grows by a
// semester at a time, so this is what keeps a page's query independent of it.
@Index('idx_course_term_category', ['term', 'category'])
export class Course {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'varchar', length: 255 })
  title!: string

  @Column({ type: 'text', nullable: true })
  description!: string | null

  @Column({ type: 'varchar', length: 120 })
  subject!: string

  /** 강좌 안내 (language) vs 문화 강좌 (culture) — the two 교육과정 menu items. */
  @Column({ type: 'varchar', length: 20, default: 'language' })
  category!: CourseCategory

  @Column({ type: 'varchar', length: 120, nullable: true })
  level!: string | null

  @Column({ type: 'varchar', length: 150, nullable: true })
  teacherName!: string | null

  /**
   * Weekly meeting pattern. The public timetable is generated from this
   * (sessions × dates between startDate and endDate), so the course is the
   * single source of truth for "when and where" — there is no separate
   * timetable table to keep in sync. Replaces the old free-text `schedule`.
   */
  @Column({ type: 'jsonb', default: [] })
  sessions!: CourseSession[]

  /** Default room for sessions that do not name their own. */
  @Column({ type: 'varchar', length: 120, nullable: true })
  classroom!: string | null

  @Column({ type: 'varchar', length: 120, nullable: true })
  courseCode!: string | null

  /**
   * 학기 — 'YYYY-1' (봄) or 'YYYY-2' (가을). The academic calendar is read one
   * semester at a time, and the office reports head counts per semester, so
   * it is stored rather than guessed from the dates on every read; it is
   * filled in from startDate when a course is saved without one.
   */
  @Column({ type: 'varchar', length: 20, nullable: true })
  term!: string | null

  /**
   * Whether the class runs for the whole semester. Most do, and then the
   * dates below are the term's and follow it when 학기 관리 changes them.
   * A 문화 강좌 is often a short course inside the semester instead — a
   * four-week 부채춤 class, say — and sets its own dates, which is what
   * this flag distinguishes. It is stored rather than inferred from the
   * dates matching the term's: "runs all semester" is a decision, and a
   * class that happens to start and end with the term is not the same thing.
   *
   * Nullable on purpose: a class entered before this existed carries dates
   * the admin typed, so it reads as null — "not stated" — and keeps them,
   * rather than being swept into following a term it never followed.
   */
  @Column({ type: 'boolean', nullable: true })
  followsTerm!: boolean | null

  @Column({ type: 'varchar', length: 20, nullable: true })
  startDate!: string | null

  /**
   * Indexed for the timetable, which asks for classes still running on a
   * date. Almost all of the history has already ended, so this is what keeps
   * a week's timetable from scanning every class ever (6.9 → 1.7 ms on
   * 5 000 classes, and it no longer grows with them).
   */
  @Index('idx_course_end_date')
  @Column({ type: 'varchar', length: 20, nullable: true })
  endDate!: string | null

  @Column({ type: 'int', default: 0 })
  capacity!: number

  /* ---- Semester table (학사 일정) ------------------------------------- */

  /** 예상수 — how many learners the class was planned for. */
  @Column({ type: 'int', nullable: true })
  expectedStudents!: number | null

  /** 실제수 — how many actually enrolled. */
  @Column({ type: 'int', nullable: true })
  actualStudents!: number | null

  /** 총 시간수 — teaching hours over the whole semester. */
  @Column({ type: 'real', nullable: true })
  totalHours!: number | null

  /**
   * 주 시간 — weekly hours. Derived from `sessions` when the admin leaves it
   * blank, but stored, because institutes count periods their own way and the
   * office needs the number it reports, not ours.
   */
  @Column({ type: 'real', nullable: true })
  weeklyHours!: number | null

  /** The public site lists published courses only — indexed for that filter. */
  @Index()
  @Column({ type: 'boolean', default: false })
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
