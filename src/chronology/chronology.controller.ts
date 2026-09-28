import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common'

import { Authenticated } from '../auth/auth.guard'
import { ChronologyService } from './chronology.service'
import { CreateChronologyEntryDto, UpdateChronologyEntryDto } from './dto/chronology-entry.dto'

@Controller('chronology')
export class ChronologyController {
  constructor(private readonly chronologyService: ChronologyService) {}

  /** Published entries (public); `?all=true` adds the hidden ones for the admin. */
  @Get()
  list(@Query('all') all?: string) {
    return this.chronologyService.list({ publishedOnly: all !== 'true' })
  }

  @Post()
  @Authenticated('admin')
  create(@Body() body: CreateChronologyEntryDto) {
    return this.chronologyService.create(body)
  }

  @Patch(':id')
  @Authenticated('admin')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() body: UpdateChronologyEntryDto) {
    return this.chronologyService.update(id, body)
  }

  @Delete(':id')
  @Authenticated('admin')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.chronologyService.remove(id)
  }
}
