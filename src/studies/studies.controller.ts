import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common'

import { Authenticated, CurrentUser } from '../auth/auth.guard'
import { CreateStudyAbroadDto, UpdateStudyAbroadDto } from './dto/study-abroad.dto'
import { StudiesService } from './studies.service'
import type { AuthUser } from '../auth/auth.service'
import { isAdmin, visibleTo } from '../auth/visibility'

@Controller('studies')
export class StudiesController {
  constructor(private readonly studiesService: StudiesService) {}

  /** `?all=true` adds the unpublished ones for the admin page. */
  @Get()
  list(@CurrentUser() user: AuthUser | null, @Query('all') all?: string) {
    return this.studiesService.list({ publishedOnly: all !== 'true' || !isAdmin(user) })
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser | null) {
    return visibleTo(user, await this.studiesService.getById(id), 'errors.study.notFound')
  }

  @Post()
  @Authenticated('admin')
  create(@Body() body: CreateStudyAbroadDto) {
    return this.studiesService.create(body)
  }

  @Patch(':id')
  @Authenticated('admin')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() body: UpdateStudyAbroadDto) {
    return this.studiesService.update(id, body)
  }

  @Delete(':id')
  @Authenticated('admin')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.studiesService.remove(id)
  }
}
