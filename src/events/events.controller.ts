import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common'

import { Authenticated, CurrentUser } from '../auth/auth.guard'
import { CreateScheduleEventDto, UpdateScheduleEventDto } from './dto/schedule-event.dto'
import { EventsService } from './events.service'
import type { AuthUser } from '../auth/auth.service'
import { isAdmin } from '../auth/visibility'

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  /** `?term=2026-2` for one semester's table; `?all=true` adds hidden rows. */
  @Get()
  list(@CurrentUser() user: AuthUser | null, @Query('term') term?: string, @Query('all') all?: string) {
    return this.eventsService.list({ publishedOnly: all !== 'true' || !isAdmin(user), termCode: typeof term === 'string' && term ? term : undefined })
  }

  @Post()
  @Authenticated('admin')
  create(@Body() body: CreateScheduleEventDto) {
    return this.eventsService.create(body)
  }

  @Patch(':id')
  @Authenticated('admin')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() body: UpdateScheduleEventDto) {
    return this.eventsService.update(id, body)
  }

  @Delete(':id')
  @Authenticated('admin')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.eventsService.remove(id)
  }
}
