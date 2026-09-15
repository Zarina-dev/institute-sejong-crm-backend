import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm'

import { Student } from '../../students/entities/student.entity'
import { Course } from './course.entity'

export type EnrollmentStatus = 'active' | 'completed' | 'paused'

/**
 * A student's confirmed place on a course.
 *
 * The scalar `courseId` / `studentId` columns and the `course` / `student`
 * relations share one database column each (`@JoinColumn` names the scalar
 * column). Previously the join columns were `course_id` / `student_id` while
 * the service wrote to `courseId` / `studentId`, so the foreign keys were
 * always NULL: relations loaded as null and ON DELETE CASCADE never fired.
 *
 * One enrollment per (student, course) is enforced by the database, not only
 * by the pre-insert lookup in the service, so two concurrent approvals cannot
 * create a duplicate.
 */
@Entity('enrollments')
@Unique('uq_enrollment_student_course', ['studentId', 'courseId'])
export class Enrollment {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Index()
  @Column({ type: 'uuid' })
  courseId!: string

  @ManyToOne(() => Course, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'courseId' })
  course!: Course

  @Index()
  @Column({ type: 'uuid' })
  studentId!: string

  @ManyToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student!: Student

  @Column({ type: 'varchar', length: 20, nullable: true })
  status!: EnrollmentStatus | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date
}
