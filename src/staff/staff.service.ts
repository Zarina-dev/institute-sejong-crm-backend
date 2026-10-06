import { BadRequestException, Injectable, Logger, NotFoundException, OnApplicationBootstrap } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, IsNull, Repository } from 'typeorm'

import { removeUploadedFile } from '../common/uploaded-files'
import { CreateStaffDto, UpdateStaffDto } from './dto/staff.dto'
import { StaffMember } from './entities/staff-member.entity'

@Injectable()
export class StaffService implements OnApplicationBootstrap {
  private readonly logger = new Logger(StaffService.name)

  constructor(
    @InjectRepository(StaffMember)
    private readonly staffRepository: Repository<StaffMember>,
  ) {}

  /** Public: published members in display order; the page groups them by status. */
  listPublished() {
    return this.staffRepository.find({
      where: { isPublished: true },
      order: { sortOrder: 'ASC', name: 'ASC' },
    })
  }

  /** Admin: everyone, hidden members included. */
  listAll() {
    return this.staffRepository.find({ order: { sortOrder: 'ASC', name: 'ASC' } })
  }

  async getById(id: string) {
    const member = await this.staffRepository.findOne({ where: { id } })

    if (!member) {
      throw new NotFoundException('errors.staff.notFound')
    }

    return member
  }

  create(dto: CreateStaffDto) {
    const member = this.staffRepository.create({
      ...dto,
      bio: dto.bio ?? '',
      photoUrl: dto.photoUrl ?? null,
      email: dto.email || null,
      sortOrder: dto.sortOrder ?? 0,
      isPublished: dto.isPublished ?? true,
      startDate: dto.startDate || null,
      endDate: dto.endDate || null,
    })

    this.assertPeriod(member.startDate, member.endDate)

    return this.staffRepository.save(member)
  }

  async update(id: string, dto: UpdateStaffDto) {
    const member = await this.getById(id)
    const previousPhoto = member.photoUrl

    Object.assign(member, dto, dto.email !== undefined ? { email: dto.email || null } : {})
    this.assertPeriod(member.startDate, member.endDate)
    const saved = await this.staffRepository.save(member)

    // A replaced or cleared photo should not linger on disk.
    if (dto.photoUrl !== undefined && previousPhoto && previousPhoto !== saved.photoUrl) {
      await removeUploadedFile(previousPhoto)
    }

    return saved
  }

  async remove(id: string) {
    const member = await this.getById(id)
    await this.staffRepository.remove(member)

    if (member.photoUrl) {
      await removeUploadedFile(member.photoUrl)
    }

    return { success: true }
  }

  /**
   * Drag-and-drop ordering: `ids` is the full list in its new order. Members
   * not mentioned keep their number, so a stale client can't hide anyone.
   */
  async reorder(ids: string[]) {
    const members = await this.staffRepository.find({ where: { id: In(ids) } })
    const byId = new Map(members.map((member) => [member.id, member]))

    ids.forEach((id, index) => {
      const member = byId.get(id)
      if (member) {
        member.sortOrder = index
      }
    })

    await this.staffRepository.save(members)
    return this.listAll()
  }

  /** ISO dates compare correctly as text. */
  private assertPeriod(startDate: string | null, endDate: string | null) {
    if (startDate && endDate && endDate < startDate) {
      throw new BadRequestException('validation.staff.endBeforeStart')
    }
  }

  /**
   * One-time backfill for the dates. Before they existed, the period was
   * written into the bio — "2013.9.1 - 2015.12.31", "2017.9.1 - 현재" — so it
   * is read from there once, for members who have no start date yet. Someone
   * already marked as former whose bio gives no end date is closed on the day
   * they were last edited, the closest thing on record. Each one is logged,
   * so the result can be checked in 교직원 관리.
   */
  async onApplicationBootstrap() {
    const pending = await this.staffRepository.find({ where: { startDate: IsNull() } })
    let filled = 0

    for (const member of pending) {
      const period = periodFromText(member.bio)

      if (!period && member.isCurrent) {
        continue
      }

      member.startDate = period?.start ?? null
      member.endDate = period?.end ?? (member.isCurrent ? null : member.updatedAt.toISOString().slice(0, 10))
      await this.staffRepository.save(member)
      filled += 1
      this.logger.log(`${member.name}: ${member.startDate ?? '?'} ~ ${member.endDate ?? '현재'}`)
    }

    if (filled > 0) {
      this.logger.log(`Filled employment dates for ${filled} member(s) from their bios.`)
    }
  }
}

const DATE_IN_TEXT = /(\d{4})[.\-/]\s*(\d{1,2})[.\-/]\s*(\d{1,2})/

/** "2013.9.1" / "2013.09.01" / "2013-9-1" → "2013-09-01". */
function isoFrom(text: string) {
  const match = text.match(DATE_IN_TEXT)
  return match ? `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}` : null
}

/** "2013.9.1 - 2015.12.31" or "2013.9.1 - 현재", anywhere in a text. */
function periodFromText(text: string) {
  const match = text.match(/(\d{4}[.\-/]\s*\d{1,2}[.\-/]\s*\d{1,2})\.?\s*[-~–]\s*(\d{4}[.\-/]\s*\d{1,2}[.\-/]\s*\d{1,2}|현재)/)

  if (!match) {
    return null
  }

  const start = isoFrom(match[1])
  const end = match[2] === '현재' ? null : isoFrom(match[2])

  return start ? { start, end } : null
}