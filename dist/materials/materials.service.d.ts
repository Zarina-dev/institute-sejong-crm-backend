import { Repository } from 'typeorm';
import { LearningMaterial } from './entities/learning-material.entity';
export type MaterialsQuery = {
    page?: number;
    limit?: number;
    search?: string;
    subject?: string;
    course?: string;
    published?: string;
    sortBy?: 'title' | 'updatedAt' | 'createdAt';
    sortOrder?: 'ASC' | 'DESC';
};
export declare class MaterialsService {
    private readonly materialRepository;
    constructor(materialRepository: Repository<LearningMaterial>);
    listMaterials(query: MaterialsQuery): Promise<{
        items: {
            id: string;
            title: string;
            description: string | null;
            subject: string;
            course: string;
            fileType: string | null;
            fileSize: number | null;
            originalFileName: string | null;
            storageKey: string | null;
            thumbnailUrl: string | null;
            isPublished: boolean;
            createdAt: Date;
            updatedAt: Date;
        }[];
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    }>;
    getMaterialById(id: string): Promise<LearningMaterial>;
    createMaterial(input: Partial<LearningMaterial>): Promise<LearningMaterial>;
    updateMaterial(id: string, input: Partial<LearningMaterial>): Promise<LearningMaterial>;
    deleteMaterial(id: string): Promise<{
        success: boolean;
    }>;
    publishMaterial(id: string): Promise<LearningMaterial>;
    unpublishMaterial(id: string): Promise<LearningMaterial>;
}
