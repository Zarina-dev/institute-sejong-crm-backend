import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { unlink } from 'fs/promises'
import { basename, join } from 'path'
import { Repository } from 'typeorm'

import { IMAGES_DIR } from '../uploads/uploads.controller'
import { CreateStaffDto, UpdateStaffDto } from './dto/staff.dto'
import { StaffMember } from './entities/staff-member.entity'

@Injectable()
export class StaffService {
  private readonly logger = new Logger(StaffService.name)

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
      await this.removePhotoFile(previousPhoto)
    }

    return saved
  }

  async remove(id: string) {
    const member = await this.getById(id)
    await this.staffRepository.remove(member)

    if (member.photoUrl) {
      await this.removePhotoFile(member.photoUrl)
    }

    return { success: true }
  }

  /** Best-effort: the row change already succeeded, so a failed unlink is only logged. */
  private async removePhotoFile(photoUrl: string) {
    const file = join(IMAGES_DIR, basename(photoUrl))

    await unlink(file).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== 'ENOENT') {
        this.logger.warn(`Could not remove photo ${file}: ${error.message}`)
      }
    })
  }
}
