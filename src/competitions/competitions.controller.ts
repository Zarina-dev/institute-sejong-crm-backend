import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common'

import { Authenticated, CurrentUser } from '../auth/auth.guard'
import { CompetitionsService } from './competitions.service'
import { CreateCompetitionDto, UpdateCompetitionDto } from './dto/competition.dto'
import type { CompetitionKind } from './entities/competition.entity'
import type { AuthUser } from '../auth/auth.service'
import { isStaff, visibleTo } from '../auth/visibility'

/** Any name may be a competition, so the filter only has to be non-empty. */
const asKind = (value?: unknown): CompetitionKind | undefined => (typeof value === 'string' && value.trim()) || undefined

@Controller('competitions')
export class CompetitionsController {
  constructor(private readonly competitionsService: CompetitionsService) {}

  /**
   * `GET /competitions?kind=speech` — the published record of one
   * competition (public). `?all=true` adds the unpublished ones for the
   * admin page.
   */
  @Get()
  list(@CurrentUser() user: AuthUser | null, @Query('kind') kind?: string, @Query('all') all?: string) {
    return this.competitionsService.list({ kind: asKind(kind), publishedOnly: all !== 'true' || !isStaff(user) })
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser | null) {
    return visibleTo(user, await this.competitionsService.getById(id), 'errors.competition.notFound')
  }

  @Post()
  @Authenticated()
  create(@Body() body: CreateCompetitionDto) {
    return this.competitionsService.create(body)
  }

  @Patch(':id')
  @Authenticated()
  update(@Param('id', ParseUUIDPipe) id: string, @Body() body: UpdateCompetitionDto) {
    return this.competitionsService.update(id, body)
  }

  @Delete(':id')
  @Authenticated()
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.competitionsService.remove(id)
  }
}
