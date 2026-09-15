export declare class LearningMaterial {
    id: string;
    title: string;
    description: string | null;
    subject: string;
    course: string;
    level: string | null;
    materialType: string | null;
    storageKey: string | null;
    originalFileName: string | null;
    fileType: string | null;
    fileSize: number | null;
    thumbnailUrl: string | null;
    isPublished: boolean;
    createdAt: Date;
    updatedAt: Date;
}
