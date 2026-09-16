import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

/** A teacher or administrator shown on the About page. */
@Entity('staff_members')
@Index('idx_staff_order', ['isPublished', 'sortOrder'])
export class StaffMember {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'varchar', length: 120 })
  name!: string

  @Column({ type: 'varchar', length: 160 })
  position!: string

  @Column({ type: 'text', default: '' })
  bio!: string

  /** Site-relative `/uploads/images/…` URL from `POST /uploads/images`. */
  @Column({ type: 'varchar', length: 500, nullable: true })
  photoUrl!: string | null

  @Column({ type: 'varchar', length: 255, nullable: true })
  email!: string | null

  /** Lower comes first; ties broken by name. */
  @Column({ type: 'int', default: 0 })
  sortOrder!: number

  @Column({ type: 'boolean', default: true })
  isPublished!: boolean

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date
}
