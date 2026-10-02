import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { sanitizeRichText } from '../common/sanitize'
import { removeUploadedFile } from '../common/uploaded-files'
import { CreateMeetingDto, UpdateMeetingDto } from './dto/meeting.dto'
import { Meeting } from './entities/meeting.entity'

@Injectable()
export class MeetingsService {
  constructor(
    @InjectRepository(Meeting)
    private readonly meetingRepository: Repository<Meeting>,
  ) {}

  /**
   * Most recent meeting first, without the notes and decisions: the list
   * shows the date, who was there and the files. The texts come from
   * GET /meetings/:id when one meeting is opened — a year of weekly minutes
   * is otherwise megabytes of HTML nobody is reading.
   */
  list() {
    return this.meetingRepository.find({
      select: { id: true, title: true, heldOn: true, attendees: true, attachments: true, createdAt: true, updatedAt: true },
      order: { heldOn: 'DESC', createdAt: 'DESC' },
    })
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
      title: dto.title ?? '',
      attendees: dto.attendees ?? '',
      body: sanitizeRichText(dto.body ?? ''),
      decisions: sanitizeRichText(dto.decisions ?? ''),
      attachments: dto.attachments ?? [],
    })

    return this.meetingRepository.save(meeting)
  }

  async update(id: string, dto: UpdateMeetingDto) {
    const meeting = await this.getById(id)
    const previousFiles = meeting.attachments ?? []

    Object.assign(meeting, dto, {
      ...(dto.body !== undefined ? { body: sanitizeRichText(dto.body) } : {}),
      ...(dto.decisions !== undefined ? { decisions: sanitizeRichText(dto.decisions) } : {}),
    })

    const saved = await this.meetingRepository.save(meeting)

    // Files dropped from the list should not linger on disk.
    if (dto.attachments !== undefined) {
      const kept = new Set(saved.attachments.map((attachment) => attachment.url))
      await Promise.all(previousFiles.filter((file) => !kept.has(file.url)).map((file) => removeUploadedFile(file.url)))
    }

    return saved
  }

  async remove(id: string) {
    const meeting = await this.getById(id)
    await this.meetingRepository.remove(meeting)
    await Promise.all((meeting.attachments ?? []).map((file) => removeUploadedFile(file.url)))
    return { success: true }
  }
}
