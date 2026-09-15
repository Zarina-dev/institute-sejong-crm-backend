import { Response } from 'express';
import { MaterialsService, MaterialsQuery } from './materials.service';
import { LearningMaterial } from './entities/learning-material.entity';
export declare class MaterialsController {
    private readonly materialsService;
    constructor(materialsService: MaterialsService);
    list(query: MaterialsQuery): Promise<{
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
    findOne(id: string): Promise<LearningMaterial>;
    download(id: string, res: Response): Promise<void>;
    create(body: Partial<LearningMaterial>, file: Express.Multer.File): Promise<LearningMaterial>;
    update(id: string, body: Partial<LearningMaterial>): Promise<LearningMaterial>;
    remove(id: string): Promise<{
        success: boolean;
    }>;
    publish(id: string): Promise<LearningMaterial>;
    unpublish(id: string): Promise<LearningMaterial>;
}
