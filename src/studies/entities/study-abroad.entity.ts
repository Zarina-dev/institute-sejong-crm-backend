import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

/**
 * 한국 유학 현황 — one student the institute sent to Korea. The institute
 * keeps this as a numbered list on the wall: a photo, the year they left,
 * the name, the university and the major. Which programme took them there
 * (정부초청장학생, 교환학생 …) and how long they went for are kept beside
 * them, because that is what the next student asks about.
 *
 * The number on the wall is the position in the list, not a column: it is
 * read oldest first, so a student added today simply joins the end.
 */
@Entity('study_abroad')
@Index('idx_study_abroad_order', ['year', 'createdAt'])
export class StudyAbroad {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  /** The year they left — the list is ordered by it, earliest first. */
  @Column({ type: 'int' })
  year!: number

  @Column({ type: 'varchar', length: 150 })
  name!: string

  /** 경희대학교 · Кёнхи унив. — written the way the list is read. */
  @Column({ type: 'varchar', length: 255, default: '' })
  university!: string

  /** 전공 — 경영학, Менеджмент … */
  @Column({ type: 'varchar', length: 255, default: '' })
  major!: string

  /** 정부초청장학생(GKS), 교환학생, 어학연수 … — how they went. */
  @Column({ type: 'varchar', length: 255, default: '' })
  programme!: string

  /** 1년, 4년(학사), 6개월 … — how long they went for. */
  @Column({ type: 'varchar', length: 60, default: '' })
  duration!: string

  /** Site-relative `/uploads/images/…` portrait. */
  @Column({ type: 'varchar', length: 500, nullable: true })
  photo!: string | null

  /** Anything else worth recording — a scholarship name, a degree earned. */
  @Column({ type: 'varchar', length: 255, default: '' })
  note!: string

  @Column({ type: 'boolean', default: true })
  isPublished!: boolean

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date
}
