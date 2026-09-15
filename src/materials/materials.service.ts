import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { LearningMaterial } from './entities/learning-material.entity'

export type MaterialsQuery = {
  page?: number
  limit?: number
  search?: string
  subject?: string
  course?: string
  published?: string
  sortBy?: 'title' | 'updatedAt' | 'createdAt'
  sortOrder?: 'ASC' | 'DESC'
}

@Injectable()
export class MaterialsService {
  constructor(
    @InjectRepository(LearningMaterial)
    private readonly materialRepository: Repository<LearningMaterial>,
  ) {}

  async listMaterials(query: MaterialsQuery) {
    const page = Math.max(1, Number(query.page ?? 1))
    const limit = Math.min(50, Math.max(1, Number(query.limit ?? 20)))
    const skip = (page - 1) * limit
    const search = query.search?.trim()

    const sortBy = ['title', 'updatedAt', 'createdAt'].includes(query.sortBy ?? '') ? (query.sortBy as 'title' | 'updatedAt' | 'createdAt') : 'updatedAt'
    const sortOrder = query.sortOrder === 'ASC' ? 'ASC' : 'DESC'

    const qb = this.materialRepository
      .createQueryBuilder('material')

    if (query.published && query.published !== 'all') {
      qb.where('material.isPublished = :isPublished', { isPublished: query.published === 'true' })
    }

    if (search) {
      qb.andWhere(
        '(material.title ILIKE :search OR material.description ILIKE :search)',
        { search: `%${search}%` },
      )
    }

    if (query.subject) {
      qb.andWhere('material.subject = :subject', { subject: query.subject })
    }

    if (query.course) {
      qb.andWhere('material.course = :course', { course: query.course })
    }

    const [items, total] = await qb
      .orderBy(`material.${sortBy}`, sortOrder)
      .skip(skip)
      .take(limit)
      .getManyAndCount()

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
    }
  }

  async getMaterialById(id: string) {
    const material = await this.materialRepository.findOne({ where: { id } })

    if (!material) {
      throw new NotFoundException('Material not found')
    }

    return material
  }

  async createMaterial(input: Partial<LearningMaterial>) {
    const material = this.materialRepository.create(input)
    return this.materialRepository.save(material)
  }

  async updateMaterial(id: string, input: Partial<LearningMaterial>) {
    const material = await this.getMaterialById(id)
    Object.assign(material, input)
    return this.materialRepository.save(material)
  }

  async deleteMaterial(id: string) {
    const material = await this.getMaterialById(id)
    await this.materialRepository.remove(material)
    return { success: true }
  }

  async publishMaterial(id: string) {
    const material = await this.getMaterialById(id)
    material.isPublished = true
    return this.materialRepository.save(material)
  }

  async unpublishMaterial(id: string) {
    const material = await this.getMaterialById(id)
    material.isPublished = false
    return this.materialRepository.save(material)
  }
}
