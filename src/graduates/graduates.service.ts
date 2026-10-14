import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { CreateGraduateDto, UpdateGraduateDto } from './dto/graduate.dto'
import { Graduate } from './entities/graduate.entity'

@Injectable()
export class GraduatesService {
  constructor(
    @InjectRepository(Graduate)
    private readonly graduateRepository: Repository<Graduate>,
  ) {}

  /** The order of the list on the wall: oldest term first, then the order entered. */
  private readonly order = { year: 'ASC', term: 'ASC', createdAt: 'ASC' } as const

  list({ publishedOnly }: { publishedOnly: boolean }) {
    return this.graduateRepository.find({ where: publishedOnly ? { isPublished: true } : {}, order: this.order })
  }

  async getById(id: string) {
    const graduate = await this.graduateRepository.findOne({ where: { id } })

    if (!graduate) {
      throw new NotFoundException('errors.graduate.notFound')
    }

    return graduate
  }

  create(dto: CreateGraduateDto) {
    const graduate = this.graduateRepository.create({
      ...dto,
      name: dto.name ?? '',
      nameKy: dto.nameKy ?? '',
      note: dto.note ?? '',
      noteKy: dto.noteKy ?? '',
      isPublished: dto.isPublished ?? true,
    })

    this.assertNamed(graduate)

    return this.graduateRepository.save(graduate)
  }

  async update(id: string, dto: UpdateGraduateDto) {
    const graduate = await this.getById(id)

    Object.assign(graduate, dto)
    this.assertNamed(graduate)

    return this.graduateRepository.save(graduate)
  }

  async remove(id: string) {
    // To 최근 삭제된 항목: restorable for 30 days.
    await this.graduateRepository.softRemove(await this.getById(id))

    return { success: true }
  }

  private assertNamed(graduate: Graduate) {
    if (!graduate.name?.trim() && !graduate.nameKy?.trim()) {
      throw new BadRequestException('validation.graduate.nameRequired')
    }
  }
}
