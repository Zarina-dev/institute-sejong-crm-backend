import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'

import { removeUploadedFile } from '../common/uploaded-files'
import { CreateStaffDto, UpdateStaffDto } from './dto/staff.dto'
import { StaffMember } from './entities/staff-member.entity'

@Injectable()
export class StaffService {
  constructor(
    @InjectRepository(StaffMember)
    private readonly staffRepository: Repository<StaffMember>,
  ) {}

  /** Public: published members in display order. */
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
    })

    return this.staffRepository.save(member)
  }

  async update(id: string, dto: UpdateStaffDto) {
    const member = await this.getById(id)
    const previousPhoto = member.photoUrl

    Object.assign(member, dto, dto.email !== undefined ? { email: dto.email || null } : {})
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
}