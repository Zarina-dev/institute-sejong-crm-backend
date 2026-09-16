import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

export type NewsCategory = 'academic' | 'events' | 'campus' | 'admissions'

/** A public announcement. The public list shows published posts only. */
@Entity('news_posts')
@Index('idx_news_published_at', ['isPublished', 'publishedAt'])
export class NewsPost {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'varchar', length: 255 })
  title!: string

  /** Sanitized HTML from the admin editor. */
  @Column({ type: 'text' })
  body!: string

  @Column({ type: 'varchar', length: 500, nullable: true })
  coverImage!: string | null

  @Column({ type: 'varchar', length: 40, default: 'campus' })
  category!: NewsCategory

  @Column({ type: 'boolean', default: false })
  isPublished!: boolean

  /** Set when first published; the public list is ordered by it. */
  @Column({ type: 'timestamptz', nullable: true })
  publishedAt!: Date | null

  /** Pinned posts render as the large featured card. At most one is sensible. */
  @Column({ type: 'boolean', default: false })
  isFeatured!: boolean

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date
}
