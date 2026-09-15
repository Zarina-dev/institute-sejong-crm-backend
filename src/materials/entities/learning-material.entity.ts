import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

@Entity('learning_materials')
export class LearningMaterial {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'varchar', length: 255 })
  title!: string

  @Column({ type: 'text', nullable: true })
  description!: string | null

  @Column({ type: 'varchar', length: 120 })
  subject!: string

  @Column({ type: 'varchar', length: 120 })
  course!: string

  /**
   * 레벨 and 자료 유형 were dropped from 자료실 — materials are classified by
   * 과목 and 과정 only. The columns are kept (nullable) rather than removed so
   * that `synchronize: true` does not drop the values already stored for
   * existing rows; nothing reads them any more.
   */
  @Column({ type: 'varchar', length: 120, nullable: true })
  level!: string | null

  @Column({ type: 'varchar', length: 80, nullable: true })
  materialType!: string | null

  @Column({ type: 'varchar', length: 255, nullable: true })
  storageKey!: string | null

  @Column({ type: 'varchar', length: 255, nullable: true })
  originalFileName!: string | null

  @Column({ type: 'varchar', length: 120, nullable: true })
  fileType!: string | null

  @Column({ type: 'bigint', nullable: true })
  fileSize!: number | null

  @Column({ type: 'varchar', length: 255, nullable: true })
  thumbnailUrl!: string | null

  @Column({ type: 'boolean', default: false })
  isPublished!: boolean

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date
}
