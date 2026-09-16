import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { unlink } from 'fs/promises'
import { ILike, IsNull, Repository } from 'typeorm'

import { Course } from '../courses/entities/course.entity'
import { CreateMaterialDto } from './dto/create-material.dto'
import { UpdateMaterialDto } from './dto/update-material.dto'
import { LearningMaterial } from './entities/learning-material.entity'

export type MaterialsQuery = {
  page?: number
  limit?: number
  search?: string
  subject?: string
  course?: string
  courseId?: string
  published?: string
  sortBy?: 'title' | 'updatedAt' | 'createdAt'
  sortOrder?: 'ASC' | 'DESC'
}

const SORTABLE = ['title', 'updatedAt', 'createdAt'] as const

@Injectable()
export class MaterialsService implements OnModuleInit {
  private readonly logger = new Logger(MaterialsService.name)

  constructor(
    @InjectRepository(LearningMaterial)
    private readonly materialRepository: Repository<LearningMaterial>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
  ) {}

  /**
   * One-off, idempotent backfill: rows created before `courseId` existed are
   * linked to the course whose title equals their free-text `course` label.
   * Unmatched rows stay detached and can be fixed from the admin form.
   */
  async onModuleInit() {
    const detached = await this.materialRepository.find({ where: { courseId: IsNull() } })

    if (detached.length === 0) {
      return
    }

    let linked = 0

    for (const material of detached) {
      const course = await this.courseRepository.findOne({ where: { title: ILike(material.course.trim()) } })

      if (course) {
        material.courseId = course.id
        material.subject = course.subject
        material.course = course.title
        await this.materialRepository.save(material)
        linked += 1
      }
    }

    this.logger.log(`Linked ${linked}/${detached.length} legacy materials to courses by title.`)
  }

  private async resolveCourse(courseId: string) {
    const course = await this.courseRepository.findOne({ where: { id: courseId } })

    if (!course) {
      throw new BadRequestException('errors.course.notFound')
    }

    return course
  }

  async listMaterials(query: MaterialsQuery) {
    const page = Math.max(1, Number(query.page ?? 1))
    const limit = Math.min(50, Math.max(1, Number(query.limit ?? 20)))
    const search = query.search?.trim()
    const sortBy = SORTABLE.includes(query.sortBy as (typeof SORTABLE)[number]) ? query.sortBy! : 'updatedAt'
    const sortOrder = query.sortOrder === 'ASC' ? 'ASC' : 'DESC'

    const qb = this.materialRepository.createQueryBuilder('material')

    if (query.published && query.published !== 'all') {
      qb.andWhere('material.isPublished = :isPublished', { isPublished: query.published === 'true' })
    }

    if (search) {
      qb.andWhere('(material.title ILIKE :search OR material.description ILIKE :search)', { search: `%${search}%` })
    }

    if (query.subject) {
      qb.andWhere('material.subject = :subject', { subject: query.subject })
    }

    if (query.course) {
      qb.andWhere('material.course = :course', { course: query.course })
    }

    if (query.courseId) {
      qb.andWhere('material.courseId = :courseId', { courseId: query.courseId })
    }

    const [items, total] = await qb
      .orderBy(`material.${sortBy}`, sortOrder)
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount()

    return {
      items: items.map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        subject: item.subject,
        course: item.course,
        courseId: item.courseId,
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
      throw new NotFoundException('errors.material.notFound')
    }

    return material
  }

  async createMaterial(dto: CreateMaterialDto, file?: Express.Multer.File) {
    const course = await this.resolveCourse(dto.courseId)

    const material = this.materialRepository.create({
      ...dto,
      subject: course.subject,
      course: course.title,
      description: dto.description ?? null,
      isPublished: dto.isPublished ?? false,
      storageKey: file?.path ?? null,
      originalFileName: file?.originalname ?? null,
      fileType: file?.mimetype ?? null,
      fileSize: file?.size ?? null,
    })

    return this.materialRepository.save(material)
  }

  async updateMaterial(id: string, dto: UpdateMaterialDto) {
    const material = await this.getMaterialById(id)
    // Only DTO-whitelisted keys reach here, so a spread cannot touch id,
    // storageKey or timestamps.
    Object.assign(material, dto)

    if (dto.courseId) {
      const course = await this.resolveCourse(dto.courseId)
      material.subject = course.subject
      material.course = course.title
    }

    return this.materialRepository.save(material)
  }

  async deleteMaterial(id: string) {
    const material = await this.getMaterialById(id)
    await this.materialRepository.remove(material)

    // The row is gone; the file must not outlive it. Failure to unlink is
    // logged, not surfaced — the user's delete already succeeded.
    if (material.storageKey) {
      await unlink(material.storageKey).catch((error: NodeJS.ErrnoException) => {
        if (error.code !== 'ENOENT') {
          this.logger.warn(`Could not remove file ${material.storageKey}: ${error.message}`)
        }
      })
    }

    return { success: true }
  }

  async setPublished(id: string, isPublished: boolean) {
    const material = await this.getMaterialById(id)
    material.isPublished = isPublished
    return this.materialRepository.save(material)
  }
}
