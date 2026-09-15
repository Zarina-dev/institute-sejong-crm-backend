import { StudentsService, CreateStudentInput } from './students.service';
export declare class StudentsController {
    private readonly studentsService;
    constructor(studentsService: StudentsService);
    list(status?: string): Promise<{
        password: string;
        id: string;
        name: string;
        studentId: string;
        email: string;
        phone: string;
        course: string;
        level: string;
        admissionDate: string | null;
        status: import("./entities/student.entity").StudentStatus;
        topikFiles: import("./entities/student.entity").TopikFile[];
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    login(body: {
        studentId: string;
        password: string;
    }): Promise<{
        valid: boolean;
        reason: string | undefined;
        student?: undefined;
    } | {
        valid: boolean;
        student: {
            id: string;
            name: string;
            studentId: string;
            email: string;
            phone: string;
            course: string;
            level: string;
            admissionDate: string | null;
            status: import("./entities/student.entity").StudentStatus;
            topikFiles: import("./entities/student.entity").TopikFile[];
            createdAt: Date;
            updatedAt: Date;
        } | undefined;
        reason?: undefined;
    }>;
    create(body: CreateStudentInput): Promise<{
        password: string;
        id: string;
        name: string;
        studentId: string;
        email: string;
        phone: string;
        course: string;
        level: string;
        admissionDate: string | null;
        status: import("./entities/student.entity").StudentStatus;
        topikFiles: import("./entities/student.entity").TopikFile[];
        createdAt: Date;
        updatedAt: Date;
    }>;
    update(id: string, body: Partial<CreateStudentInput>): Promise<{
        password: string;
        id: string;
        name: string;
        studentId: string;
        email: string;
        phone: string;
        course: string;
        level: string;
        admissionDate: string | null;
        status: import("./entities/student.entity").StudentStatus;
        topikFiles: import("./entities/student.entity").TopikFile[];
        createdAt: Date;
        updatedAt: Date;
    }>;
    remove(id: string): Promise<{
        success: boolean;
    }>;
}
