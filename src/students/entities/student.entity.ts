import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

export type StudentStatus = 'active' | 'inactive'

export type TopikFile = {
  id: string
  name: string
  size: number
  type: string
}

@Entity('students')
export class Student {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'varchar', length: 120 })
  name!: string

  /** Human-readable login id (e.g. ST-1001); `unique` also creates the index. */
  @Column({ type: 'varchar', length: 120, unique: true })
  studentId!: string

  @Column({ type: 'varchar', length: 255 })
  email!: string

  @Column({ type: 'varchar', length: 80 })
  phone!: string

  @Column({ type: 'varchar', length: 120 })
  course!: string

  /** TOPIK level label (e.g. "TOPIK 3") — free text chosen in the admin form. */
  @Column({ type: 'varchar', length: 120 })
  level!: string

  @Column({ type: 'varchar', length: 20, nullable: true })
  admissionDate!: string | null

  @Index()
  @Column({ type: 'varchar', length: 20, default: 'active' })
  status!: StudentStatus

  @Column({ type: 'varchar', length: 255 })
  password!: string

  @Column({ type: 'jsonb', nullable: true, default: [] })
  topikFiles!: TopikFile[]

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date
}
