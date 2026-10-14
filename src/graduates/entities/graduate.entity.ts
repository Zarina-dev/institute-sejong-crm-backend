import { Column, CreateDateColumn, DeleteDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

/**
 * 졸업생 현황 — one student who finished the whole course (세종한국어 8책)
 * and graduated. The institute keeps them as a numbered list by the term
 * they graduated in: 2016년 1학기 1번 …, with a note on where they went next
 * (한국정부초청장학생, 한국 대학 진학, 세종학당 운영요원 …).
 *
 * The 졸업생 번호 is the position in that list, not a column — read oldest
 * term first, a graduate added today joins the end and nobody is renumbered
 * by hand (the printed list numbered two terms 54–60 twice).
 *
 * Name and note are kept in Korean and in Kyrgyz, as in 한국 유학 현황; the
 * site shows the reader's script and falls back to the other.
 */
@Entity('graduates')
@Index('idx_graduates_order', ['year', 'term', 'createdAt'])
export class Graduate {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'int' })
  year!: number

  /** 1 or 2 — the 학기 of that year. */
  @Column({ type: 'int' })
  term!: number

  /** In Korean. At least one of the two names is required. */
  @Column({ type: 'varchar', length: 150, default: '' })
  name!: string

  @Column({ type: 'varchar', length: 150, default: '' })
  nameKy!: string

  /** 비고: what came after — a scholarship, a university, a job. */
  @Column({ type: 'varchar', length: 255, default: '' })
  note!: string

  @Column({ type: 'varchar', length: 255, default: '' })
  noteKy!: string

  @Column({ type: 'boolean', default: true })
  isPublished!: boolean

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date

  /** Deleting moves the graduate to 최근 삭제된 항목 for 30 days (see TrashService). */
  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt!: Date | null
}
