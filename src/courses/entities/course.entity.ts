import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

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

  @Column({ type: 'varchar', length: 120, nullable: true })
  level!: string | null

  @Column({ type: 'varchar', length: 150, nullable: true })
  teacherName!: string | null

  @Column({ type: 'varchar', length: 150, nullable: true })
  schedule!: string | null

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
