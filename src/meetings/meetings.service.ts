import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { sanitizeRichText } from '../common/sanitize'
import { CreateMeetingDto, UpdateMeetingDto } from './dto/meeting.dto'
import { Meeting } from './entities/meeting.entity'

@Injectable()
export class MeetingsService {
  constructor(
    @InjectRepository(Meeting)
    private readonly meetingRepository: Repository<Meeting>,
  ) {}

  /** Most recent meeting first. */
  list() {
    return this.meetingRepository.find({ order: { heldOn: 'DESC', createdAt: 'DESC' } })
  }

  async getById(id: string) {
    const meeting = await this.meetingRepository.findOne({ where: { id } })

    if (!meeting) {
      throw new NotFoundException('errors.meeting.notFound')
    }

    return meeting
  }

  create(dto: CreateMeetingDto) {
    const meeting = this.meetingRepository.create({
      ...dto,
      attendees: dto.attendees ?? '',
      body: sanitizeRichText(dto.body ?? ''),
      decisions: sanitizeRichText(dto.decisions ?? ''),
    })

    return this.meetingRepository.save(meeting)
  }

  async update(id: string, dto: UpdateMeetingDto) {
    const meeting = await this.getById(id)

    Object.assign(meeting, dto, {
      ...(dto.body !== undefined ? { body: sanitizeRichText(dto.body) } : {}),
      ...(dto.decisions !== undefined ? { decisions: sanitizeRichText(dto.decisions) } : {}),
    })

    return this.meetingRepository.save(meeting)
  }

  async remove(id: string) {
    const meeting = await this.getById(id)
    await this.meetingRepository.remove(meeting)
    return { success: true }
  }
}
