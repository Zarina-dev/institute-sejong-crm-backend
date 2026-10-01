import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { removeUploadedFile } from '../common/uploaded-files'
import { CreateStudyAbroadDto, UpdateStudyAbroadDto } from './dto/study-abroad.dto'
import { StudyAbroad } from './entities/study-abroad.entity'

@Injectable()
export class StudiesService {
  constructor(
    @InjectRepository(StudyAbroad)
    private readonly studyRepository: Repository<StudyAbroad>,
  ) {}

  /**
   * Oldest first — the list is read as the institute's record of everyone it
   * has sent, from the first student onwards, so someone entered today joins
   * the end. Within a year, the order they were entered in.
   */
  private readonly order = { year: 'ASC', createdAt: 'ASC' } as const

  list({ publishedOnly }: { publishedOnly: boolean }) {
    return this.studyRepository.find({
      where: publishedOnly ? { isPublished: true } : {},
      order: this.order,
    })
  }

  async getById(id: string) {
    const entry = await this.studyRepository.findOne({ where: { id } })

    if (!entry) {
      throw new NotFoundException('errors.study.notFound')
    }

    return entry
  }

  create(dto: CreateStudyAbroadDto) {
    const entry = this.studyRepository.create({
      ...dto,
      university: dto.university ?? '',
      major: dto.major ?? '',
      programme: dto.programme ?? '',
      duration: dto.duration ?? '',
      note: dto.note ?? '',
      photo: dto.photo ?? null,
      isPublished: dto.isPublished ?? true,
    })

    return this.studyRepository.save(entry)
  }

  async update(id: string, dto: UpdateStudyAbroadDto) {
    const entry = await this.getById(id)
    const previousPhoto = entry.photo

    Object.assign(entry, dto)

    const saved = await this.studyRepository.save(entry)

    if (dto.photo !== undefined && previousPhoto && previousPhoto !== saved.photo) {
      await removeUploadedFile(previousPhoto)
    }

    return saved
  }

  async remove(id: string) {
    const entry = await this.getById(id)
    await this.studyRepository.remove(entry)
    await removeUploadedFile(entry.photo)

    return { success: true }
  }
}
