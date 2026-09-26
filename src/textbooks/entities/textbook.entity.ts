import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

/**
 * 교재 안내 — one row per textbook, so every entry on the public page carries
 * the same four facts: cover, title, description and where to buy it.
 */
@Entity('textbooks')
@Index('idx_textbook_order', ['isPublished', 'sortOrder'])
export class Textbook {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  /** 교재명 */
  @Column({ type: 'varchar', length: 255 })
  title!: string

  /** 교재 소개 */
  @Column({ type: 'text', default: '' })
  description!: string

  /** 교재 사진 — site-relative `/uploads/images/…` path. */
  @Column({ type: 'varchar', length: 500, nullable: true })
  coverImage!: string | null

  /** 구매처 (shop, office, online store …). */
  @Column({ type: 'varchar', length: 255, default: '' })
  purchasePlace!: string

  /** Optional link to that shop. */
  @Column({ type: 'varchar', length: 500, nullable: true })
  purchaseUrl!: string | null

  /** Lower comes first; ties broken by title. */
  @Column({ type: 'int', default: 0 })
  sortOrder!: number

  @Column({ type: 'boolean', default: true })
  isPublished!: boolean

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date
}