export declare class Course {
    id: string;
    title: string;
    description: string | null;
    subject: string;
    level: string | null;
    teacherName: string | null;
    schedule: string | null;
    classroom: string | null;
    courseCode: string | null;
    startDate: string | null;
    endDate: string | null;
    capacity: number;
    isPublished: boolean;
    createdAt: Date;
    updatedAt: Date;
}
