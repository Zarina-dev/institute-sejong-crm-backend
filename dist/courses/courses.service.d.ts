import { Repository } from 'typeorm';
import { Course } from './course.entity';
import { CourseApplication } from './course-application.entity';
import { Enrollment } from './enrollment.entity';
import { Student } from '../students/student.entity';
export type CreateCourseInput = {
    title: string;
    description?: string | null;
    subject: string;
    level?: string | null;
    teacherName?: string | null;
    schedule?: string | null;
    classroom?: string | null;
    courseCode?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    capacity?: number;
    isPublished?: boolean;
};
export type CreateApplicationInput = {
    applicantName: string;
    applicantEmail: string;
    phone?: string | null;
    goal?: string | null;
    courseId: string;
    studentId?: string | null;
    documents?: Array<{
        id: string;
        name: string;
        size: number;
        type: string;
        dataUrl?: string;
    }>;
};
export declare class CoursesService {
    private readonly courseRepository;
    private readonly applicationRepository;
    private readonly enrollmentRepository;
    private readonly studentRepository;
    constructor(courseRepository: Repository<Course>, applicationRepository: Repository<CourseApplication>, enrollmentRepository: Repository<Enrollment>, studentRepository: Repository<Student>);
    listCourses({ publishedOnly }?: {
        publishedOnly?: boolean;
    }): Promise<Course[]>;
    getCourseById(id: string): Promise<Course>;
    createCourse(input: CreateCourseInput): Promise<Course>;
    updateCourse(id: string, input: Partial<CreateCourseInput>): Promise<Course>;
    deleteCourse(id: string): Promise<{
        success: boolean;
    }>;
    publishCourse(id: string): Promise<Course>;
    unpublishCourse(id: string): Promise<Course>;
    listApplications(): Promise<{
        course: Course;
        student: Student | null;
        id: string;
        applicantName: string;
        applicantEmail: string;
        phone: string | null;
        goal: string | null;
        status: "pending" | "approved" | "rejected" | "enrolled" | null;
        courseId: string;
        studentId: string | null;
        documents: Array<{
            id: string;
            name: string;
            size: number;
            type: string;
            dataUrl?: string;
        }>;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    getApplicationById(id: string): Promise<{
        course: Course;
        student: Student | null;
        id: string;
        applicantName: string;
        applicantEmail: string;
        phone: string | null;
        goal: string | null;
        status: "pending" | "approved" | "rejected" | "enrolled" | null;
        courseId: string;
        studentId: string | null;
        documents: Array<{
            id: string;
            name: string;
            size: number;
            type: string;
            dataUrl?: string;
        }>;
        createdAt: Date;
        updatedAt: Date;
    }>;
    createApplication(input: CreateApplicationInput): Promise<CourseApplication>;
    updateApplicationStatus(id: string, status: 'approved' | 'rejected' | 'enrolled'): Promise<{
        course: Course;
        student: Student | null;
        id: string;
        applicantName: string;
        applicantEmail: string;
        phone: string | null;
        goal: string | null;
        status: "pending" | "approved" | "rejected" | "enrolled" | null;
        courseId: string;
        studentId: string | null;
        documents: Array<{
            id: string;
            name: string;
            size: number;
            type: string;
            dataUrl?: string;
        }>;
        createdAt: Date;
        updatedAt: Date;
    } & CourseApplication>;
    rejectApplication(id: string): Promise<{
        course: Course;
        student: Student | null;
        id: string;
        applicantName: string;
        applicantEmail: string;
        phone: string | null;
        goal: string | null;
        status: "pending" | "approved" | "rejected" | "enrolled" | null;
        courseId: string;
        studentId: string | null;
        documents: Array<{
            id: string;
            name: string;
            size: number;
            type: string;
            dataUrl?: string;
        }>;
        createdAt: Date;
        updatedAt: Date;
    } & CourseApplication>;
    approveApplication(id: string): Promise<{
        course: Course;
        student: Student | null;
        id: string;
        applicantName: string;
        applicantEmail: string;
        phone: string | null;
        goal: string | null;
        status: "pending" | "approved" | "rejected" | "enrolled" | null;
        courseId: string;
        studentId: string | null;
        documents: Array<{
            id: string;
            name: string;
            size: number;
            type: string;
            dataUrl?: string;
        }>;
        createdAt: Date;
        updatedAt: Date;
    } & CourseApplication>;
    listEnrollments(): Promise<Enrollment[]>;
    createEnrollment(studentId: string, courseId: string): Promise<Enrollment>;
    listStudentEnrollments(studentId: string): Promise<Enrollment[]>;
}
