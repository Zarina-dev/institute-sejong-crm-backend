import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { localized } from '../common/i18n/i18n-exception.filter'

import { TermsService } from '../terms/terms.service'
import { CreateScheduleEventDto, UpdateScheduleEventDto } from './dto/schedule-event.dto'
import { ScheduleEvent } from './entities/schedule-event.entity'

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(ScheduleEvent)
    private readonly eventRepository: Repository<ScheduleEvent>,
    private readonly termsService: TermsService,
  ) {}

  /** The table is read down the semester, so the earliest event comes first. */
  list({ publishedOnly, termCode }: { publishedOnly: boolean; termCode?: string }) {
    return this.eventRepository.find({
      where: {
        ...(publishedOnly ? { isPublished: true } : {}),
        ...(termCode ? { termCode } : {}),
      },
      order: { startDate: 'ASC' },
    })
  }

  async getById(id: string) {
    const event = await this.eventRepository.findOne({ where: { id } })

    if (!event) {
      throw new NotFoundException('errors.event.notFound')
    }

    return event
  }

  async create(dto: CreateScheduleEventDto) {
    this.assertPeriod(dto.startDate, dto.endDate)

    const event = this.eventRepository.create({
      ...dto,
      termCode: await this.fileUnder(dto.startDate, dto.endDate, dto.termCode),
      endDate: dto.endDate || null,
      titleKy: dto.titleKy ?? '',
      titleRu: dto.titleRu ?? '',
      titleEn: dto.titleEn ?? '',
      note: dto.note ?? '',
      isPublished: dto.isPublished ?? true,
    })

    return this.eventRepository.save(event)
  }

  async update(id: string, dto: UpdateScheduleEventDto) {
    const event = await this.getById(id)
    this.assertPeriod(dto.startDate ?? event.startDate, dto.endDate ?? event.endDate)

    // Publishing alone does not touch the dates, so it is not checked again:
    // a row saved before this rule must still be hideable.
    const moved = dto.startDate !== undefined || dto.endDate !== undefined || dto.termCode !== undefined

    Object.assign(event, dto, dto.endDate !== undefined ? { endDate: dto.endDate || null } : {})

    if (moved) {
      event.termCode = await this.fileUnder(event.startDate, event.endDate, dto.termCode ?? null)
    }

    return this.eventRepository.save(event)
  }

  async remove(id: string) {
    const event = await this.getById(id)
    // To 최근 삭제된 항목: restorable for 30 days; files stay until it is purged.
    await this.eventRepository.softRemove(event)
    return { success: true }
  }

  /**
   * The semester an event is filed under — the one its dates fall in, read
   * from 학기 관리. The site lists 행사 일정 by semester, so a row whose dates
   * and semester disagree would show up in the wrong table. Hence:
   * - a date outside every semester is refused: that semester is set up first;
   * - an event runs within one semester: one that crosses into the next
   *   (a break included) is entered once in each;
   * - a semester the admin chose must be the one the dates are in.
   */
  private async fileUnder(startDate: string, endDate: string | null | undefined, chosen?: string | null) {
    const terms = await this.termsService.list()
    const name = (term: { name: string; code: string }) => term.name || term.code
    const period = (term: { startDate: string; endDate: string }) => `${term.startDate} ~ ${term.endDate}`
    const term = terms.find((candidate) => candidate.startDate <= startDate && startDate <= candidate.endDate)
    const picked = chosen ? terms.find((candidate) => candidate.code === chosen) : undefined

    if (picked && picked !== term) {
      throw new BadRequestException(
        localized('validation.event.outsideTerm', {
          date: startDate,
          term: name(picked),
          period: period(picked),
          actual: term ? name(term) : '—',
        }),
      )
    }

    if (!term) {
      throw new BadRequestException(localized('validation.event.noTerm', { date: startDate }))
    }

    if (endDate && endDate > term.endDate) {
      throw new BadRequestException(localized('validation.event.crossesTerm', { date: endDate, term: name(term), period: period(term) }))
    }

    return term.code
  }

  private assertPeriod(startDate: string, endDate: string | null | undefined) {
    if (endDate && endDate < startDate) {
      throw new BadRequestException('validation.event.endBeforeStart')
    }
  }
}
