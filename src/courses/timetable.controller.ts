import { Controller, Get, Query } from '@nestjs/common'

import { TimetableService, type TimetableQuery } from './timetable.service'

/**
 * `GET /schedule?from&to&courseGroup&subject` — read-only view generated
 * from courses. The path stays `/schedule` for the public site.
 */
@Controller('schedule')
export class TimetableController {
  constructor(private readonly timetableService: TimetableService) {}

  @Get()
  list(@Query() query: TimetableQuery) {
    return this.timetableService.list(query)
  }
}
