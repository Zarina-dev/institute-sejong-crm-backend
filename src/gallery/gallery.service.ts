import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { GalleryAlbum } from './entities/gallery-album.entity'

/** The old gallery albums, read only (see GalleryController). */
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
}