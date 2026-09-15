import { Course } from './course.entity';
import { Student } from '../students/student.entity';
export declare class CourseApplication {
    id: string;
    applicantName: string;
    applicantEmail: string;
    phone: string | null;
    goal: string | null;
    status: 'pending' | 'approved' | 'rejected' | 'enrolled' | null;
    courseId: string;
    course: Course;
    studentId: string | null;
    student: Student | null;
    documents: Array<{
        id: string;
        name: string;
        size: number;
        type: string;
        dataUrl?: string;
    }>;
    createdAt: Date;
    updatedAt: Date;
}
