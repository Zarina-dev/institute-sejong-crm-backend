import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common'

import { CreateScheduleEntryDto, UpdateScheduleEntryDto } from './dto/schedule.dto'
import { ScheduleService, type ScheduleQuery } from './schedule.service'

@Controller('schedule')
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  /** `GET /schedule?from=YYYY-MM-DD&to=YYYY-MM-DD&courseGroup=&subject=` — defaults to the current week. */
  @Get()
  list(@Query() query: ScheduleQuery) {
    return this.scheduleService.list(query)
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.scheduleService.getById(id)
  }

  @Post()
  create(@Body() body: CreateScheduleEntryDto) {
    return this.scheduleService.create(body)
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() body: UpdateScheduleEntryDto) {
    return this.scheduleService.update(id, body)
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.scheduleService.remove(id)
  }
}
