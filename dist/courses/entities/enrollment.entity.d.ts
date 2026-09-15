import { Student } from '../../students/entities/student.entity';
import { Course } from './course.entity';
export type EnrollmentStatus = 'active' | 'completed' | 'paused';
export declare class Enrollment {
    id: string;
    courseId: string;
    course: Course;
    studentId: string;
    student: Student;
    status: EnrollmentStatus | null;
    createdAt: Date;
    updatedAt: Date;
}
