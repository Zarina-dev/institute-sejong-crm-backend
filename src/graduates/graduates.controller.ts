import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common'

import { Authenticated, CurrentUser } from '../auth/auth.guard'
import { CreateGraduateDto, UpdateGraduateDto } from './dto/graduate.dto'
import { GraduatesService } from './graduates.service'
import type { AuthUser } from '../auth/auth.service'
import { isStaff, visibleTo } from '../auth/visibility'

@Controller('graduates')
export class GraduatesController {
  constructor(private readonly graduatesService: GraduatesService) {}

  /** `?all=true` adds the unpublished ones for the admin page. */
  @Get()
  list(@CurrentUser() user: AuthUser | null, @Query('all') all?: string) {
    return this.graduatesService.list({ publishedOnly: all !== 'true' || !isStaff(user) })
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser | null) {
    return visibleTo(user, await this.graduatesService.getById(id), 'errors.graduate.notFound')
  }

  @Post()
  @Authenticated()
  create(@Body() body: CreateGraduateDto) {
    return this.graduatesService.create(body)
  }

  @Patch(':id')
  @Authenticated()
  update(@Param('id', ParseUUIDPipe) id: string, @Body() body: UpdateGraduateDto) {
    return this.graduatesService.update(id, body)
  }

  @Delete(':id')
  @Authenticated()
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.graduatesService.remove(id)
  }
}
