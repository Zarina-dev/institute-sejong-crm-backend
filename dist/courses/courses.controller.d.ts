import { CoursesService, CreateApplicationInput, CreateCourseInput } from './courses.service';
export declare class CoursesController {
    private readonly coursesService;
    constructor(coursesService: CoursesService);
    list(publishedOnly?: string): Promise<import("./course.entity").Course[]>;
    listApplications(): Promise<{
        course: import("./course.entity").Course;
        student: import("../students/student.entity").Student | null;
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
    findApplication(id: string): Promise<{
        course: import("./course.entity").Course;
        student: import("../students/student.entity").Student | null;
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
    listEnrollments(): Promise<import("./enrollment.entity").Enrollment[]>;
    listStudentEnrollments(studentId: string): Promise<import("./enrollment.entity").Enrollment[]>;
    findOne(id: string): Promise<import("./course.entity").Course>;
    create(body: CreateCourseInput): Promise<import("./course.entity").Course>;
    update(id: string, body: Partial<CreateCourseInput>): Promise<import("./course.entity").Course>;
    remove(id: string): Promise<{
        success: boolean;
    }>;
    publish(id: string): Promise<import("./course.entity").Course>;
    unpublish(id: string): Promise<import("./course.entity").Course>;
    createApplication(body: CreateApplicationInput): Promise<import("./course-application.entity").CourseApplication>;
    updateApplicationStatus(id: string, body: {
        status: 'approved' | 'rejected' | 'enrolled';
    }): Promise<{
        course: import("./course.entity").Course;
        student: import("../students/student.entity").Student | null;
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
    } & import("./course-application.entity").CourseApplication>;
    createEnrollment(body: {
        studentId: string;
        courseId: string;
    }): Promise<import("./enrollment.entity").Enrollment>;
}
