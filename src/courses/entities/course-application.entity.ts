import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

import { Student } from '../../students/entities/student.entity'
import { Course } from './course.entity'

export type ApplicationStatus = 'pending' | 'approved' | 'rejected' | 'enrolled'

export type ApplicationDocument = {
  id: string
  name: string
  size: number
  type: string
  dataUrl?: string
}

/**
 * A request to join a course, from a signed-in student or an anonymous
 * applicant. See Enrollment for why the scalar ids and the relations share
 * a column.
 */
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

  @Index()
  @Column({ type: 'varchar', length: 20, nullable: true })
  status!: ApplicationStatus | null

  @Index()
  @Column({ type: 'uuid' })
  courseId!: string

  @ManyToOne(() => Course, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'courseId' })
  course!: Course

  @Index()
  @Column({ type: 'uuid', nullable: true })
  studentId!: string | null

  /** Kept when the student is deleted so the application history survives. */
  @ManyToOne(() => Student, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'studentId' })
  student!: Student | null

  @Column({ type: 'jsonb', nullable: true, default: [] })
  documents!: ApplicationDocument[]

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date
}
