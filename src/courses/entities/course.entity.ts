import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

/** ISO weekday: 1 = Monday … 7 = Sunday. Times are HH:mm. */
export type CourseSession = {
  weekday: 1 | 2 | 3 | 4 | 5 | 6 | 7
  startTime: string
  endTime: string
  classroom?: string | null
}

export type CourseCategory = 'language' | 'culture'

@Entity('courses')
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

  @Column({ type: 'varchar', length: 20, nullable: true })
  startDate!: string | null

  @Column({ type: 'varchar', length: 20, nullable: true })
  endDate!: string | null

  @Column({ type: 'int', default: 0 })
  capacity!: number

  /** The public site lists published courses only — indexed for that filter. */
  @Index()
  @Column({ type: 'boolean', default: false })
  isPublished!: boolean

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date
}
