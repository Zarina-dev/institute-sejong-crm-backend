import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Between, Repository } from 'typeorm'

import { CreateScheduleEntryDto, UpdateScheduleEntryDto } from './dto/schedule.dto'
import { ScheduleEntry } from './entities/schedule-entry.entity'

export type ScheduleQuery = {
  /** Inclusive ISO dates; default = the current Monday..Sunday. */
  from?: string
  to?: string
  courseGroup?: string
  subject?: string
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

/** Monday..Sunday containing `today`, as ISO dates. */
export function currentWeek(today = new Date()) {
  const monday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
  const offset = (monday.getUTCDay() + 6) % 7 // Monday = 0
  monday.setUTCDate(monday.getUTCDate() - offset)
  const sunday = new Date(monday)
  sunday.setUTCDate(monday.getUTCDate() + 6)
  return { from: isoDate(monday), to: isoDate(sunday) }
}

@Injectable()
export class ScheduleService {
  constructor(
    @InjectRepository(ScheduleEntry)
    private readonly scheduleRepository: Repository<ScheduleEntry>,
  ) {}

  list(query: ScheduleQuery) {
    const week = currentWeek()
    const from = query.from ?? week.from
    const to = query.to ?? week.to

    return this.scheduleRepository.find({
      where: {
        date: Between(from, to),
        ...(query.courseGroup ? { courseGroup: query.courseGroup } : {}),
        ...(query.subject ? { subject: query.subject } : {}),
      },
      order: { date: 'ASC', startTime: 'ASC' },
    })
  }

  async getById(id: string) {
    const entry = await this.scheduleRepository.findOne({ where: { id } })

    if (!entry) {
      throw new NotFoundException('errors.schedule.notFound')
    }

    return entry
  }

  create(dto: CreateScheduleEntryDto) {
    this.assertTimeOrder(dto.startTime, dto.endTime)
    return this.scheduleRepository.save(this.scheduleRepository.create(dto))
  }

  async update(id: string, dto: UpdateScheduleEntryDto) {
    const entry = await this.getById(id)
    Object.assign(entry, dto)
    this.assertTimeOrder(entry.startTime, entry.endTime)
    return this.scheduleRepository.save(entry)
  }

  async remove(id: string) {
    const entry = await this.getById(id)
    await this.scheduleRepository.remove(entry)
    return { success: true }
  }

  private assertTimeOrder(start: string, end: string) {
    // HH:mm strings compare correctly as text.
    if (end <= start) {
      throw new BadRequestException('validation.schedule.endBeforeStart')
    }
  }
}
