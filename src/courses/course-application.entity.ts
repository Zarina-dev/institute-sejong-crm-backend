import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { Course } from './course.entity'
import { Student } from '../students/student.entity'

@Entity('course_applications')
export class CourseApplication {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'varchar', length: 120 })
  applicantName!: string

  @Column({ type: 'varchar', length: 120 })
  applicantEmail!: string

  @Column({ type: 'varchar', length: 120, nullable: true })
  phone!: string | null

  @Column({ type: 'varchar', length: 120, nullable: true })
  goal!: string | null

  @Column({ type: 'varchar', length: 120, nullable: true })
  status!: 'pending' | 'approved' | 'rejected' | 'enrolled' | null

  @Column({ type: 'uuid' })
  courseId!: string

  @ManyToOne(() => Course, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'course_id' })
  course!: Course

  @Column({ type: 'uuid', nullable: true })
  studentId!: string | null

  @ManyToOne(() => Student, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'student_id' })
  student!: Student | null

  @Column({ type: 'jsonb', nullable: true, default: [] })
  documents!: Array<{
    id: string
    name: string
    size: number
    type: string
    dataUrl?: string
  }>

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date
}
