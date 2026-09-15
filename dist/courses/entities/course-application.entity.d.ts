import { Student } from '../../students/entities/student.entity';
import { Course } from './course.entity';
export type ApplicationStatus = 'pending' | 'approved' | 'rejected' | 'enrolled';
export type ApplicationDocument = {
    id: string;
    name: string;
    size: number;
    type: string;
    dataUrl?: string;
};
export declare class CourseApplication {
    id: string;
    applicantName: string;
    applicantEmail: string;
    phone: string | null;
    goal: string | null;
    status: ApplicationStatus | null;
    courseId: string;
    course: Course;
    studentId: string | null;
    student: Student | null;
    documents: ApplicationDocument[];
    createdAt: Date;
    updatedAt: Date;
}
