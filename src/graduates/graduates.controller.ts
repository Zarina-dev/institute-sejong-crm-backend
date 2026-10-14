import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common'

import { Authenticated } from '../auth/auth.guard'
import { CreateGraduateDto, UpdateGraduateDto } from './dto/graduate.dto'
import { GraduatesService } from './graduates.service'

@Controller('graduates')
export class GraduatesController {
  constructor(private readonly graduatesService: GraduatesService) {}

  /** `?all=true` adds the unpublished ones for the admin page. */
  @Get()
  list(@Query('all') all?: string) {
    return this.graduatesService.list({ publishedOnly: all !== 'true' })
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.graduatesService.getById(id)
  }

  @Post()
  @Authenticated('admin')
  create(@Body() body: CreateGraduateDto) {
    return this.graduatesService.create(body)
  }

  @Patch(':id')
  @Authenticated('admin')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() body: UpdateGraduateDto) {
    return this.graduatesService.update(id, body)
  }

  @Delete(':id')
  @Authenticated('admin')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.graduatesService.remove(id)
  }
}
