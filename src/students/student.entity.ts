import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

@Entity('students')
export class Student {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'varchar', length: 120 })
  name!: string

  @Column({ type: 'varchar', length: 120, unique: true })
  studentId!: string

  @Column({ type: 'varchar', length: 255 })
  email!: string

  @Column({ type: 'varchar', length: 80 })
  phone!: string

  @Column({ type: 'varchar', length: 120 })
  course!: string

  @Column({ type: 'varchar', length: 120 })
  level!: string

  @Column({ type: 'varchar', length: 20, nullable: true })
  admissionDate!: string | null

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status!: 'active' | 'inactive'

  @Column({ type: 'varchar', length: 255 })
  password!: string

  @Column({ type: 'jsonb', nullable: true, default: [] })
  topikFiles!: Array<{
    id: string
    name: string
    size: number
    type: string
  }>

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date
}
