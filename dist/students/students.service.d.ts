import { Repository } from 'typeorm';
import { Student } from './student.entity';
export type CreateStudentInput = {
    name: string;
    studentId: string;
    email: string;
    phone: string;
    course: string;
    level: string;
    admissionDate?: string | null;
    status?: 'active' | 'inactive';
    password?: string;
    topikFiles?: Array<{
        id: string;
        name: string;
        size: number;
        type: string;
    }>;
};
export declare class StudentsService {
    private readonly studentRepository;
    constructor(studentRepository: Repository<Student>);
    listStudents(): Promise<{
        password: string;
        id: string;
        name: string;
        studentId: string;
        email: string;
        phone: string;
        course: string;
        level: string;
        admissionDate: string | null;
        status: "active" | "inactive";
        topikFiles: Array<{
            id: string;
            name: string;
            size: number;
            type: string;
        }>;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    getStudentByStudentId(studentId: string): Promise<Student>;
    createStudent(input: CreateStudentInput): Promise<{
        password: string;
        id: string;
        name: string;
        studentId: string;
        email: string;
        phone: string;
        course: string;
        level: string;
        admissionDate: string | null;
        status: "active" | "inactive";
        topikFiles: Array<{
            id: string;
            name: string;
            size: number;
            type: string;
        }>;
        createdAt: Date;
        updatedAt: Date;
    }>;
    updateStudent(id: string, input: Partial<CreateStudentInput>): Promise<{
        password: string;
        id: string;
        name: string;
        studentId: string;
        email: string;
        phone: string;
        course: string;
        level: string;
        admissionDate: string | null;
        status: "active" | "inactive";
        topikFiles: Array<{
            id: string;
            name: string;
            size: number;
            type: string;
        }>;
        createdAt: Date;
        updatedAt: Date;
    }>;
    deleteStudent(id: string): Promise<{
        success: boolean;
    }>;
    validateStudentLogin(studentId: string, password: string): Promise<{
        valid: boolean;
        reason: string;
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
            status: "active" | "inactive";
            topikFiles: Array<{
                id: string;
                name: string;
                size: number;
                type: string;
            }>;
            createdAt: Date;
            updatedAt: Date;
        };
        reason?: undefined;
    }>;
    private sanitizeStudent;
    private generatePassword;
}
