import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

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
      // Which semester's table it belongs to follows from the date, the same
      // way a class is filed — 학기 관리 is the one place those dates live.
      termCode: dto.termCode ?? (await this.termsService.codeForDate(dto.startDate)),
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

    Object.assign(event, dto, dto.endDate !== undefined ? { endDate: dto.endDate || null } : {})

    if (dto.termCode === undefined && dto.startDate) {
      event.termCode = await this.termsService.codeForDate(dto.startDate)
    }

    return this.eventRepository.save(event)
  }

  async remove(id: string) {
    const event = await this.getById(id)
    await this.eventRepository.remove(event)
    return { success: true }
  }

  private assertPeriod(startDate: string, endDate: string | null | undefined) {
    if (endDate && endDate < startDate) {
      throw new BadRequestException('validation.event.endBeforeStart')
    }
  }
}
