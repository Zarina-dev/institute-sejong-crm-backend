import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

/** The recurring events the institute photographs, per the site plan. */
export const EVENT_TAGS = [
  'speechContest',
  'writingContest',
  'foodExperience',
  'opening',
  'graduation',
  'folkGames',
  'historyTour',
  'camp',
  'ska',
  'topik',
  'other',
] as const

export type EventTag = (typeof EVENT_TAGS)[number]

/**
 * 학당 발자취 — one photo album per event, grouped by year on the public page.
 * High-resolution photos live in a Google Photos album (the plan's decision);
 * only the link and an optional cover image are stored here.
 */
@Entity('gallery_albums')
@Index('idx_album_year', ['isPublished', 'year'])
export class GalleryAlbum {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'int' })
  year!: number

  @Column({ type: 'varchar', length: 255 })
  title!: string

  @Column({ type: 'varchar', length: 40, default: 'other' })
  eventTag!: EventTag

  @Column({ type: 'text', default: '' })
  description!: string

  /** Google Photos (or any https) album link. */
  @Column({ type: 'varchar', length: 500, nullable: true })
  albumUrl!: string | null

  /** Site-relative `/uploads/images/…` thumbnail. */
  @Column({ type: 'varchar', length: 500, nullable: true })
  coverImage!: string | null

  /** Optional exact date, for ordering inside a year. */
  @Column({ type: 'varchar', length: 20, nullable: true })
  heldOn!: string | null

  @Column({ type: 'boolean', default: true })
  isPublished!: boolean

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date
}