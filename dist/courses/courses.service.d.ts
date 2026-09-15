import { Repository } from 'typeorm';
import { Course } from './entities/course.entity';
import { CourseApplication } from './entities/course-application.entity';
import { Enrollment } from './entities/enrollment.entity';
import { Student } from '../students/entities/student.entity';
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
    listApplications(): Promise<CourseApplication[]>;
    getApplicationById(id: string): Promise<CourseApplication>;
    createApplication(input: CreateApplicationInput): Promise<CourseApplication>;
    updateApplicationStatus(id: string, status: 'approved' | 'rejected' | 'enrolled'): Promise<CourseApplication>;
    rejectApplication(id: string): Promise<CourseApplication>;
    approveApplication(id: string): Promise<CourseApplication>;
    listEnrollments(): Promise<Enrollment[]>;
    createEnrollment(studentId: string, courseId: string): Promise<Enrollment>;
    listStudentEnrollments(studentId: string): Promise<Enrollment[]>;
}
