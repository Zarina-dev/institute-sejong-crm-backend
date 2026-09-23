import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { removeUploadedFile } from '../common/uploaded-files'
import { CreateAlbumDto, UpdateAlbumDto } from './dto/gallery.dto'
import { GalleryAlbum } from './entities/gallery-album.entity'

@Injectable()
export class GalleryService {
  constructor(
    @InjectRepository(GalleryAlbum)
    private readonly albumRepository: Repository<GalleryAlbum>,
  ) {}

  /** Newest year first; inside a year the most recent event first. */
  private order = { year: 'DESC', heldOn: 'DESC', createdAt: 'DESC' } as const

  listPublished() {
    return this.albumRepository.find({ where: { isPublished: true }, order: this.order })
  }

  listAll() {
    return this.albumRepository.find({ order: this.order })
  }

  async getById(id: string) {
    const album = await this.albumRepository.findOne({ where: { id } })

    if (!album) {
      throw new NotFoundException('errors.album.notFound')
    }

    return album
  }

  create(dto: CreateAlbumDto) {
    const album = this.albumRepository.create({
      ...dto,
      eventTag: dto.eventTag ?? 'other',
      description: dto.description ?? '',
      albumUrl: dto.albumUrl || null,
      coverImage: dto.coverImage ?? null,
      heldOn: dto.heldOn || null,
      isPublished: dto.isPublished ?? true,
    })

    return this.albumRepository.save(album)
  }

  async update(id: string, dto: UpdateAlbumDto) {
    const album = await this.getById(id)
    const previousCover = album.coverImage

    Object.assign(album, dto, {
      ...(dto.albumUrl !== undefined ? { albumUrl: dto.albumUrl || null } : {}),
      ...(dto.heldOn !== undefined ? { heldOn: dto.heldOn || null } : {}),
    })

    const saved = await this.albumRepository.save(album)

    if (dto.coverImage !== undefined && previousCover && previousCover !== saved.coverImage) {
      await removeUploadedFile(previousCover)
    }

    return saved
  }

  async remove(id: string) {
    const album = await this.getById(id)
    await this.albumRepository.remove(album)
    await removeUploadedFile(album.coverImage)
    return { success: true }
  }
}