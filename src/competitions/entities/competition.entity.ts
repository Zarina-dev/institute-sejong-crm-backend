import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

/**
 * The two competitions the institute has always run. They are codes rather
 * than names because the site translates them; a competition added later is
 * stored under the name the admin gives it, so the list is open.
 */
export const BUILTIN_COMPETITION_KINDS = ['speech', 'writing'] as const
export type CompetitionKind = string

/** One line of the results table: 순위 · 이름 · 비고 (반, 상품, 소속 …). */
export type CompetitionWinner = {
  rank: number
  name: string
  note?: string | null
}

/**
 * 각종 대회 기록 — one row per running of a competition (말하기 대회,
 * 백일장). The winners are part of the record rather than a table of their
 * own: they are only ever read with the event they belong to, and an edition
 * is saved and published as one thing.
 */
@Entity('competitions')
@Index('idx_competition_kind_year', ['kind', 'year'])
export class Competition {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  /** `speech` 말하기 대회, `writing` 백일장, or the name of another competition. */
  @Column({ type: 'varchar', length: 60 })
  kind!: CompetitionKind

  /** 제10회 한국어 말하기 대회 — the name as it was announced. */
  @Column({ type: 'varchar', length: 255 })
  title!: string

  /** Newest year first on the public page. */
  @Column({ type: 'int' })
  year!: number

  @Column({ type: 'varchar', length: 20, nullable: true })
  heldOn!: string | null

  /** 장소 */
  @Column({ type: 'varchar', length: 255, default: '' })
  venue!: string

  /** 참가자 수 */
  @Column({ type: 'int', nullable: true })
  participants!: number | null

  /** 대회 소개 · 총평 — sanitized HTML from the rich-text editor. */
  @Column({ type: 'text', default: '' })
  summary!: string

  @Column({ type: 'jsonb', default: [] })
  winners!: CompetitionWinner[]

  /** Site-relative `/uploads/images/…` photo — the one used as the cover. */
  @Column({ type: 'varchar', length: 500, nullable: true })
  coverImage!: string | null

  /**
   * The rest of the photos from that day. Kept on the row like the winners:
   * they are only ever read with the edition they belong to.
   */
  @Column({ type: 'jsonb', default: [] })
  images!: string[]

  /** Google Photos album, as in 행사 사진첩. */
  @Column({ type: 'varchar', length: 500, nullable: true })
  albumUrl!: string | null

  @Column({ type: 'boolean', default: true })
  isPublished!: boolean

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date
}
