import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common'

import { CurrentUser } from '../auth/auth.guard'
import type { AuthUser } from '../auth/auth.service'
import { isAdmin, visibleTo } from '../auth/visibility'
import { GalleryService } from './gallery.service'

/**
 * The albums of the old gallery, read only. They became 행사·대회 records
 * (competitions), which use the same photo files; the rows stay as the
 * record of where those came from, and nothing changes or deletes them —
 * that would take the photos away from the competitions too.
 */
@Controller('gallery')
export class GalleryController {
  constructor(private readonly galleryService: GalleryService) {}

  /** `GET /gallery` — published albums (public). `?all=true` adds the hidden ones, for the admin only. */
  @Get()
  list(@CurrentUser() user: AuthUser | null, @Query('all') all?: string) {
    return all === 'true' && isAdmin(user) ? this.galleryService.listAll() : this.galleryService.listPublished()
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser | null) {
    return visibleTo(user, await this.galleryService.getById(id), 'errors.album.notFound')
  }
}