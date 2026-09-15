"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MaterialsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const learning_material_entity_1 = require("./entities/learning-material.entity");
let MaterialsService = class MaterialsService {
    constructor(materialRepository) {
        this.materialRepository = materialRepository;
    }
    async listMaterials(query) {
        const page = Math.max(1, Number(query.page ?? 1));
        const limit = Math.min(50, Math.max(1, Number(query.limit ?? 20)));
        const skip = (page - 1) * limit;
        const search = query.search?.trim();
        const sortBy = ['title', 'updatedAt', 'createdAt'].includes(query.sortBy ?? '') ? query.sortBy : 'updatedAt';
        const sortOrder = query.sortOrder === 'ASC' ? 'ASC' : 'DESC';
        const qb = this.materialRepository
            .createQueryBuilder('material');
        if (query.published && query.published !== 'all') {
            qb.where('material.isPublished = :isPublished', { isPublished: query.published === 'true' });
        }
        if (search) {
            qb.andWhere('(material.title ILIKE :search OR material.description ILIKE :search)', { search: `%${search}%` });
        }
        if (query.subject) {
            qb.andWhere('material.subject = :subject', { subject: query.subject });
        }
        if (query.course) {
            qb.andWhere('material.course = :course', { course: query.course });
        }
        const [items, total] = await qb
            .orderBy(`material.${sortBy}`, sortOrder)
            .skip(skip)
            .take(limit)
            .getManyAndCount();
        return {
            items: items.map((item) => ({
                id: item.id,
                title: item.title,
                description: item.description,
                subject: item.subject,
                course: item.course,
                fileType: item.fileType,
                fileSize: item.fileSize,
                originalFileName: item.originalFileName,
                storageKey: item.storageKey,
                thumbnailUrl: item.thumbnailUrl,
                isPublished: item.isPublished,
                createdAt: item.createdAt,
                updatedAt: item.updatedAt,
            })),
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        };
    }
    async getMaterialById(id) {
        const material = await this.materialRepository.findOne({ where: { id } });
        if (!material) {
            throw new common_1.NotFoundException('Material not found');
        }
        return material;
    }
    async createMaterial(input) {
        const material = this.materialRepository.create(input);
        return this.materialRepository.save(material);
    }
    async updateMaterial(id, input) {
        const material = await this.getMaterialById(id);
        Object.assign(material, input);
        return this.materialRepository.save(material);
    }
    async deleteMaterial(id) {
        const material = await this.getMaterialById(id);
        await this.materialRepository.remove(material);
        return { success: true };
    }
    async publishMaterial(id) {
        const material = await this.getMaterialById(id);
        material.isPublished = true;
        return this.materialRepository.save(material);
    }
    async unpublishMaterial(id) {
        const material = await this.getMaterialById(id);
        material.isPublished = false;
        return this.materialRepository.save(material);
    }
};
exports.MaterialsService = MaterialsService;
exports.MaterialsService = MaterialsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(learning_material_entity_1.LearningMaterial)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], MaterialsService);
//# sourceMappingURL=materials.service.js.map