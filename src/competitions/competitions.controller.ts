import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common'

import { Authenticated } from '../auth/auth.guard'
import { CompetitionsService } from './competitions.service'
import { CreateCompetitionDto, UpdateCompetitionDto } from './dto/competition.dto'
import type { CompetitionKind } from './entities/competition.entity'

/** Any name may be a competition, so the filter only has to be non-empty. */
const asKind = (value?: string): CompetitionKind | undefined => value?.trim() || undefined

@Controller('competitions')
export class CompetitionsController {
  constructor(private readonly competitionsService: CompetitionsService) {}

  /**
   * `GET /competitions?kind=speech` — the published record of one
   * competition (public). `?all=true` adds the unpublished ones for the
   * admin page.
   */
  @Get()
  list(@Query('kind') kind?: string, @Query('all') all?: string) {
    return this.competitionsService.list({ kind: asKind(kind), publishedOnly: all !== 'true' })
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.competitionsService.getById(id)
  }

  @Post()
  @Authenticated('admin')
  create(@Body() body: CreateCompetitionDto) {
    return this.competitionsService.create(body)
  }

  @Patch(':id')
  @Authenticated('admin')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() body: UpdateCompetitionDto) {
    return this.competitionsService.update(id, body)
  }

  @Delete(':id')
  @Authenticated('admin')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.competitionsService.remove(id)
  }
}
