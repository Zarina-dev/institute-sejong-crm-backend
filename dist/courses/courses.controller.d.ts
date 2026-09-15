import { CoursesService, CreateApplicationInput, CreateCourseInput } from './courses.service';
export declare class CoursesController {
    private readonly coursesService;
    constructor(coursesService: CoursesService);
    list(publishedOnly?: string): Promise<import("./entities/course.entity").Course[]>;
    listApplications(): Promise<import("./entities/course-application.entity").CourseApplication[]>;
    findApplication(id: string): Promise<import("./entities/course-application.entity").CourseApplication>;
    listEnrollments(): Promise<import("./entities/enrollment.entity").Enrollment[]>;
    listStudentEnrollments(studentId: string): Promise<import("./entities/enrollment.entity").Enrollment[]>;
    findOne(id: string): Promise<import("./entities/course.entity").Course>;
    create(body: CreateCourseInput): Promise<import("./entities/course.entity").Course>;
    update(id: string, body: Partial<CreateCourseInput>): Promise<import("./entities/course.entity").Course>;
    remove(id: string): Promise<{
        success: boolean;
    }>;
    publish(id: string): Promise<import("./entities/course.entity").Course>;
    unpublish(id: string): Promise<import("./entities/course.entity").Course>;
    createApplication(body: CreateApplicationInput): Promise<import("./entities/course-application.entity").CourseApplication>;
    updateApplicationStatus(id: string, body: {
        status: 'approved' | 'rejected' | 'enrolled';
    }): Promise<import("./entities/course-application.entity").CourseApplication>;
    createEnrollment(body: {
        studentId: string;
        courseId: string;
    }): Promise<import("./entities/enrollment.entity").Enrollment>;
}
