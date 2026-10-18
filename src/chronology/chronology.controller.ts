import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common'

import { Authenticated, CurrentUser } from '../auth/auth.guard'
import { ChronologyService } from './chronology.service'
import { CreateChronologyEntryDto, UpdateChronologyEntryDto } from './dto/chronology-entry.dto'
import type { AuthUser } from '../auth/auth.service'
import { isStaff } from '../auth/visibility'

@Controller('chronology')
export class ChronologyController {
  constructor(private readonly chronologyService: ChronologyService) {}

  /** Published entries (public); `?all=true` adds the hidden ones for the admin. */
  @Get()
  list(@CurrentUser() user: AuthUser | null, @Query('all') all?: string) {
    return this.chronologyService.list({ publishedOnly: all !== 'true' || !isStaff(user) })
  }

  @Post()
  @Authenticated()
  create(@Body() body: CreateChronologyEntryDto) {
    return this.chronologyService.create(body)
  }

  @Patch(':id')
  @Authenticated()
  update(@Param('id', ParseUUIDPipe) id: string, @Body() body: UpdateChronologyEntryDto) {
    return this.chronologyService.update(id, body)
  }

  @Delete(':id')
  @Authenticated()
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.chronologyService.remove(id)
  }
}
