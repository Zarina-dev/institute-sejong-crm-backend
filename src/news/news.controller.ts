import { Authenticated, CurrentUser } from '../auth/auth.guard'
import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common'

import { CreateNewsDto, UpdateNewsDto } from './dto/news.dto'
import { NewsService } from './news.service'
import type { AuthUser } from '../auth/auth.service'
import { isStaff, visibleTo } from '../auth/visibility'

@Controller('news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  /** `GET /news` — published posts (public). `?all=true` adds the drafts, for the admin only. */
  @Get()
  list(@CurrentUser() user: AuthUser | null, @Query('all') all?: string, @Query('limit') limit?: string) {
    if (all === 'true' && isStaff(user)) {
      return this.newsService.listAll()
    }

    const take = Math.min(50, Math.max(1, Number(limit) || 50))
    return this.newsService.listPublished(take)
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser | null) {
    return visibleTo(user, await this.newsService.getById(id), 'errors.news.notFound')
  }

  @Post()
  @Authenticated()
  create(@Body() body: CreateNewsDto) {
    return this.newsService.create(body)
  }

  @Patch(':id')
  @Authenticated()
  update(@Param('id', ParseUUIDPipe) id: string, @Body() body: UpdateNewsDto) {
    return this.newsService.update(id, body)
  }

  @Post(':id/publish')
  @Authenticated()
  publish(@Param('id', ParseUUIDPipe) id: string) {
    return this.newsService.setPublished(id, true)
  }

  @Post(':id/unpublish')
  @Authenticated()
  unpublish(@Param('id', ParseUUIDPipe) id: string) {
    return this.newsService.setPublished(id, false)
  }

  @Delete(':id')
  @Authenticated()
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.newsService.remove(id)
  }
}
