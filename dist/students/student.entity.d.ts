export declare class Student {
    id: string;
    name: string;
    studentId: string;
    email: string;
    phone: string;
    course: string;
    level: string;
    admissionDate: string | null;
    status: 'active' | 'inactive';
    password: string;
    topikFiles: Array<{
        id: string;
        name: string;
        size: number;
        type: string;
    }>;
    createdAt: Date;
    updatedAt: Date;
}
