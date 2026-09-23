import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common'

import { Authenticated } from '../auth/auth.guard'
import { CreateAlbumDto, UpdateAlbumDto } from './dto/gallery.dto'
import { GalleryService } from './gallery.service'

@Controller('gallery')
export class GalleryController {
  constructor(private readonly galleryService: GalleryService) {}

  /** `GET /gallery` — published albums (public). `?all=true` for the admin page. */
  @Get()
  list(@Query('all') all?: string) {
    return all === 'true' ? this.galleryService.listAll() : this.galleryService.listPublished()
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.galleryService.getById(id)
  }

  @Post()
  @Authenticated('admin')
  create(@Body() body: CreateAlbumDto) {
    return this.galleryService.create(body)
  }

  @Patch(':id')
  @Authenticated('admin')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() body: UpdateAlbumDto) {
    return this.galleryService.update(id, body)
  }

  @Delete(':id')
  @Authenticated('admin')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.galleryService.remove(id)
  }
}