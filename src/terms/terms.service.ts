import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Not, Repository } from 'typeorm'

import { localized } from '../common/i18n/i18n-exception.filter'
import { Course } from '../courses/entities/course.entity'
import { CreateTermDto, UpdateTermDto } from './dto/term.dto'
import { AcademicTerm, type TermKind } from './entities/term.entity'

@Injectable()
export class TermsService {
  constructor(
    @InjectRepository(AcademicTerm)
    private readonly termRepository: Repository<AcademicTerm>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
  ) {}

  /** Newest first, and within a year in the order they actually ran. */
  list() {
    return this.termRepository.find({ order: { startDate: 'DESC' } })
  }

  async getById(id: string) {
    const term = await this.termRepository.findOne({ where: { id } })

    if (!term) {
      throw new NotFoundException('errors.term.notFound')
    }

    return term
  }

  /**
   * The term a date falls in, by the institute's own dates. Returns null when
   * no term covers it — the caller decides what that means.
   */
  async codeForDate(date: string | null | undefined): Promise<string | null> {
    if (!date) {
      return null
    }

    const terms = await this.list()
    return terms.find((term) => term.startDate <= date && date <= term.endDate)?.code ?? null
  }

  /** The term behind a stored code, or null if that term is gone. */
  byCode(code: string | null | undefined) {
    return code ? this.termRepository.findOne({ where: { code } }) : Promise.resolve(null)
  }

  async create(dto: CreateTermDto) {
    this.assertPeriod(dto.startDate, dto.endDate)

    const code = await this.nextCode(dto.year, dto.kind)
    await this.assertNoOverlap(dto.startDate, dto.endDate)

    const term = this.termRepository.create({ ...dto, code, name: dto.name ?? '' })

    return this.termRepository.save(term)
  }

  async update(id: string, dto: UpdateTermDto) {
    const term = await this.getById(id)
    const startDate = dto.startDate ?? term.startDate
    const endDate = dto.endDate ?? term.endDate

    this.assertPeriod(startDate, endDate)
    await this.assertNoOverlap(startDate, endDate, id)

    const movedSlot = (dto.year !== undefined && dto.year !== term.year) || (dto.kind !== undefined && dto.kind !== term.kind)

    Object.assign(term, dto)

    // The code is the key classes already carry, so it only changes when the
    // term is actually moved to another year or kind.
    if (movedSlot) {
      term.code = await this.nextCode(term.year, term.kind, id)
    }

    const saved = await this.termRepository.save(term)

    // A class that runs the whole semester runs the whole of the new one too.
    // A class with its own dates keeps them: they were the admin's decision.
    await this.courseRepository.update(
      { term: saved.code, followsTerm: true },
      { startDate: saved.startDate, endDate: saved.endDate },
    )

    return saved
  }

  async remove(id: string) {
    const term = await this.getById(id)
    await this.termRepository.remove(term)
    return { success: true }
  }

  /**
   * '2026-1' / '2026-2' for the semesters — one of each per year — and
   * '2026-b1', '2026-b2' … for breaks, of which a year can have several.
   */
  private async nextCode(year: number, kind: TermKind, exceptId?: string) {
    const ofYear = await this.termRepository.find({ where: exceptId ? { year, id: Not(exceptId) } : { year } })

    if (kind !== 'break') {
      const suffix = kind === 'first' ? '1' : '2'

      if (ofYear.some((term) => term.kind === kind)) {
        throw new BadRequestException('validation.term.duplicate')
      }

      return `${year}-${suffix}`
    }

    const breaks = ofYear.filter((term) => term.kind === 'break').length

    return `${year}-b${breaks + 1}`
  }

  private assertPeriod(startDate: string, endDate: string) {
    if (endDate < startDate) {
      throw new BadRequestException('validation.term.endBeforeStart')
    }
  }

  /**
   * Terms are what a class's dates are matched against, so two of them may
   * not cover the same day — the answer to "which term is this?" has to be
   * a single one.
   */
  private async assertNoOverlap(startDate: string, endDate: string, exceptId?: string) {
    const terms = await this.list()
    const clash = terms.find((term) => term.id !== exceptId && term.startDate <= endDate && startDate <= term.endDate)

    if (!clash) {
      return
    }

    // Saying "those dates are taken" leaves the admin to find out by whom.
    // Name the term, its period, and the days the two actually share.
    throw new BadRequestException(
      localized('validation.term.overlap', {
        term: clash.name || clash.code,
        period: `${clash.startDate} ~ ${clash.endDate}`,
        overlap: `${startDate > clash.startDate ? startDate : clash.startDate} ~ ${endDate < clash.endDate ? endDate : clash.endDate}`,
      }),
    )
  }
}
