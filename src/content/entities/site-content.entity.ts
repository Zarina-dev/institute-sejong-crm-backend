import { Column, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

/** Editable blocks of the public site, keyed by slug. */
export const CONTENT_SLUGS = [
  'about.greeting',
  'about.location',
  'programmes.courses',
  'programmes.calendar',
  'programmes.culture',
  'notices.faq',
  'resources.textbooks',
  'resources.links',
  'history.intro',
] as const

export type ContentSlug = (typeof CONTENT_SLUGS)[number]

/**
 * One block of site copy in one language (인사말, FAQ, 교재 안내 …). The admin
 * edits them with the same rich-text editor as the news; pages fall back to
 * the institute's default language when a translation is missing.
 */
@Entity('site_content')
@Index('idx_content_slug_locale', ['slug', 'locale'], { unique: true })
export class SiteContent {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'varchar', length: 60 })
  slug!: ContentSlug

  /** UI language code: en | ru | ko | ky. */
  @Column({ type: 'varchar', length: 5 })
  locale!: string

  @Column({ type: 'varchar', length: 255, default: '' })
  title!: string

  /** Sanitized HTML from the admin editor. */
  @Column({ type: 'text', default: '' })
  body!: string

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date
}
