import { Course } from './course.entity';
import { Student } from '../students/student.entity';
export declare class Enrollment {
    id: string;
    courseId: string;
    course: Course;
    studentId: string;
    student: Student;
    status: 'active' | 'completed' | 'paused' | null;
    createdAt: Date;
    updatedAt: Date;
}
