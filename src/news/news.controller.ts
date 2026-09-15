import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common'

import { CreateNewsDto, UpdateNewsDto } from './dto/news.dto'
import { NewsService } from './news.service'

@Controller('news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  /**
   * `GET /news` — published posts (public). `?all=true` returns drafts too;
   * it is what the admin page uses. There is no auth layer yet, so this is a
   * convention, not a boundary — same as every other admin endpoint.
   */
  @Get()
  list(@Query('all') all?: string, @Query('limit') limit?: string) {
    if (all === 'true') {
      return this.newsService.listAll()
    }

    const take = Math.min(50, Math.max(1, Number(limit) || 50))
    return this.newsService.listPublished(take)
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.newsService.getById(id)
  }

  @Post()
  create(@Body() body: CreateNewsDto) {
    return this.newsService.create(body)
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() body: UpdateNewsDto) {
    return this.newsService.update(id, body)
  }

  @Post(':id/publish')
  publish(@Param('id', ParseUUIDPipe) id: string) {
    return this.newsService.setPublished(id, true)
  }

  @Post(':id/unpublish')
  unpublish(@Param('id', ParseUUIDPipe) id: string) {
    return this.newsService.setPublished(id, false)
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.newsService.remove(id)
  }
}
