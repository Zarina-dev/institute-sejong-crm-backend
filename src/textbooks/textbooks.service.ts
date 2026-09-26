import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { removeUploadedFile } from '../common/uploaded-files'
import { CreateTextbookDto, UpdateTextbookDto } from './dto/textbook.dto'
import { Textbook } from './entities/textbook.entity'

@Injectable()
export class TextbooksService {
  constructor(
    @InjectRepository(Textbook)
    private readonly textbookRepository: Repository<Textbook>,
  ) {}

  private readonly order = { sortOrder: 'ASC', title: 'ASC' } as const

  listPublished() {
    return this.textbookRepository.find({ where: { isPublished: true }, order: this.order })
  }

  listAll() {
    return this.textbookRepository.find({ order: this.order })
  }

  async getById(id: string) {
    const textbook = await this.textbookRepository.findOne({ where: { id } })

    if (!textbook) {
      throw new NotFoundException('errors.textbook.notFound')
    }

    return textbook
  }

  create(dto: CreateTextbookDto) {
    const textbook = this.textbookRepository.create({
      ...dto,
      description: dto.description ?? '',
      coverImage: dto.coverImage ?? null,
      purchasePlace: dto.purchasePlace ?? '',
      purchaseUrl: dto.purchaseUrl || null,
      sortOrder: dto.sortOrder ?? 0,
      isPublished: dto.isPublished ?? true,
    })

    return this.textbookRepository.save(textbook)
  }

  async update(id: string, dto: UpdateTextbookDto) {
    const textbook = await this.getById(id)
    const previousCover = textbook.coverImage

    Object.assign(textbook, dto, dto.purchaseUrl !== undefined ? { purchaseUrl: dto.purchaseUrl || null } : {})
    const saved = await this.textbookRepository.save(textbook)

    // A replaced or cleared cover should not linger on disk.
    if (dto.coverImage !== undefined && previousCover && previousCover !== saved.coverImage) {
      await removeUploadedFile(previousCover)
    }

    return saved
  }

  async remove(id: string) {
    const textbook = await this.getById(id)
    await this.textbookRepository.remove(textbook)
    await removeUploadedFile(textbook.coverImage)
    return { success: true }
  }
}