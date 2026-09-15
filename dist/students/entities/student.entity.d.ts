export type StudentStatus = 'active' | 'inactive';
export type TopikFile = {
    id: string;
    name: string;
    size: number;
    type: string;
};
export declare class Student {
    id: string;
    name: string;
    studentId: string;
    email: string;
    phone: string;
    course: string;
    level: string;
    admissionDate: string | null;
    status: StudentStatus;
    password: string;
    topikFiles: TopikFile[];
    createdAt: Date;
    updatedAt: Date;
}
