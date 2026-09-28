import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common'

import { Authenticated } from '../auth/auth.guard'
import { CreateMeetingDto, UpdateMeetingDto } from './dto/meeting.dto'
import { MeetingsService } from './meetings.service'

/**
 * 회의록 is internal: every route here is admin-only, reading included.
 * There is deliberately no public list endpoint.
 */
@Controller('meetings')
@Authenticated('admin')
export class MeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}

  @Get()
  list() {
    return this.meetingsService.list()
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.meetingsService.getById(id)
  }

  @Post()
  create(@Body() body: CreateMeetingDto) {
    return this.meetingsService.create(body)
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() body: UpdateMeetingDto) {
    return this.meetingsService.update(id, body)
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.meetingsService.remove(id)
  }
}
