import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { sanitizeRichText } from '../common/sanitize'
import { removeUploadedFile } from '../common/uploaded-files'
import { CreateMeetingDto, UpdateMeetingDto } from './dto/meeting.dto'
import { Meeting, type MeetingAttachment, type MeetingAttendee } from './entities/meeting.entity'

/** The one-line 참석자, written from the list so the two never disagree. */
const namesOf = (list: MeetingAttendee[]) => list.map((attendee) => attendee.name.trim()).join(', ')

/** Every file a row owns: what was handed out, and the original minutes. */
const filesOf = (meeting: { attachments?: MeetingAttachment[] | null; original?: MeetingAttachment | null }) => [
  ...(meeting.attachments ?? []),
  ...(meeting.original ? [meeting.original] : []),
]

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
      select: {
        id: true,
        title: true,
        heldOn: true,
        method: true,
        place: true,
        drafter: true,
        approver: true,
        attendees: true,
        attendeeList: true,
        attachments: true,
        original: true,
        createdAt: true,
        updatedAt: true,
      },
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
      method: dto.method ?? '',
      place: dto.place ?? '',
      drafter: dto.drafter ?? '',
      approver: dto.approver ?? '',
      attendeeList: dto.attendeeList ?? [],
      attendees: dto.attendeeList ? namesOf(dto.attendeeList) : (dto.attendees ?? ''),
      original: dto.original ?? null,
      body: sanitizeRichText(dto.body ?? ''),
      decisions: sanitizeRichText(dto.decisions ?? ''),
      attachments: dto.attachments ?? [],
    })

    return this.meetingRepository.save(meeting)
  }

  async update(id: string, dto: UpdateMeetingDto) {
    const meeting = await this.getById(id)
    const previousFiles = filesOf(meeting)

    Object.assign(meeting, dto, {
      ...(dto.body !== undefined ? { body: sanitizeRichText(dto.body) } : {}),
      ...(dto.decisions !== undefined ? { decisions: sanitizeRichText(dto.decisions) } : {}),
      ...(dto.attendeeList !== undefined ? { attendees: namesOf(dto.attendeeList) } : {}),
    })

    const saved = await this.meetingRepository.save(meeting)

    // Files dropped from the row should not linger on disk. A file moved
    // from the attachments to the original (or back) is still the row's.
    if (dto.attachments !== undefined || dto.original !== undefined) {
      const kept = new Set(filesOf(saved).map((file) => file.url))
      await Promise.all(previousFiles.filter((file) => !kept.has(file.url)).map((file) => removeUploadedFile(file.url)))
    }

    return saved
  }

  async remove(id: string) {
    const meeting = await this.getById(id)
    // To 최근 삭제된 항목: restorable for 30 days; files stay until it is purged.
    await this.meetingRepository.softRemove(meeting)
    return { success: true }
  }
}
