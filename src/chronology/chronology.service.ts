import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { CreateChronologyEntryDto, UpdateChronologyEntryDto } from './dto/chronology-entry.dto'
import { ChronologyEntry } from './entities/chronology-entry.entity'

@Injectable()
export class ChronologyService {
  constructor(
    @InjectRepository(ChronologyEntry)
    private readonly entryRepository: Repository<ChronologyEntry>,
  ) {}

  /**
   * Newest first, and within a year the later month first — a 연혁 is read
   * from today backwards. Entries with no month sort after the dated ones of
   * the same year, because "sometime in 2011" belongs under the known dates.
   */
  private readonly order = { year: 'DESC', month: 'DESC', day: 'DESC' } as const

  list({ publishedOnly }: { publishedOnly: boolean }) {
    return this.entryRepository.find({
      where: publishedOnly ? { isPublished: true } : {},
      order: this.order,
    })
  }

  async getById(id: string) {
    const entry = await this.entryRepository.findOne({ where: { id } })

    if (!entry) {
      throw new NotFoundException('errors.chronology.notFound')
    }

    return entry
  }

  create(dto: CreateChronologyEntryDto) {
    const entry = this.entryRepository.create({
      ...dto,
      month: dto.month ?? null,
      day: dto.day ?? null,
      description: dto.description ?? '',
      isMilestone: dto.isMilestone ?? false,
      isPublished: dto.isPublished ?? true,
    })

    return this.entryRepository.save(entry)
  }

  async update(id: string, dto: UpdateChronologyEntryDto) {
    const entry = await this.getById(id)
    Object.assign(entry, dto)

    return this.entryRepository.save(entry)
  }

  async remove(id: string) {
    const entry = await this.getById(id)
    // To 최근 삭제된 항목: restorable for 30 days; files stay until it is purged.
    await this.entryRepository.softRemove(entry)
    return { success: true }
  }
}
