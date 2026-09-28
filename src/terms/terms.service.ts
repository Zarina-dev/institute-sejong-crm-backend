import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Not, Repository } from 'typeorm'

import { CreateTermDto, UpdateTermDto } from './dto/term.dto'
import { AcademicTerm } from './entities/term.entity'

@Injectable()
export class TermsService {
  constructor(
    @InjectRepository(AcademicTerm)
    private readonly termRepository: Repository<AcademicTerm>,
  ) {}

  /** Newest first — the semester in progress is the one people look for. */
  list() {
    return this.termRepository.find({ order: { year: 'DESC', half: 'DESC' } })
  }

  async getById(id: string) {
    const term = await this.termRepository.findOne({ where: { id } })

    if (!term) {
      throw new NotFoundException('errors.term.notFound')
    }

    return term
  }

  /**
   * The semester a date falls in, by the institute's own dates. Returns null
   * when no term covers it — the caller decides what that means.
   */
  async codeForDate(date: string | null | undefined): Promise<string | null> {
    if (!date) {
      return null
    }

    const terms = await this.list()
    return terms.find((term) => term.startDate <= date && date <= term.endDate)?.code ?? null
  }

  async create(dto: CreateTermDto) {
    this.assertPeriod(dto.startDate, dto.endDate)
    const code = `${dto.year}-${dto.half}`
    await this.assertUnique(code)

    const term = this.termRepository.create({ ...dto, code, name: dto.name ?? '' })

    return this.termRepository.save(term)
  }

  async update(id: string, dto: UpdateTermDto) {
    const term = await this.getById(id)
    this.assertPeriod(dto.startDate ?? term.startDate, dto.endDate ?? term.endDate)

    Object.assign(term, dto)
    term.code = `${term.year}-${term.half}`
    await this.assertUnique(term.code, id)

    return this.termRepository.save(term)
  }

  async remove(id: string) {
    const term = await this.getById(id)
    await this.termRepository.remove(term)
    return { success: true }
  }

  private assertPeriod(startDate: string, endDate: string) {
    if (endDate < startDate) {
      throw new BadRequestException('validation.term.endBeforeStart')
    }
  }

  /** One row per semester: 2026-1 cannot be defined twice. */
  private async assertUnique(code: string, exceptId?: string) {
    const clash = await this.termRepository.findOne({
      where: exceptId ? { code, id: Not(exceptId) } : { code },
    })

    if (clash) {
      throw new BadRequestException('validation.term.duplicate')
    }
  }
}
