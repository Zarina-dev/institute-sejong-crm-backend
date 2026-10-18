import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common'

import { Authenticated, CurrentUser } from '../auth/auth.guard'
import { CreateTextbookDto, ReorderTextbooksDto, UpdateTextbookDto } from './dto/textbook.dto'
import { TextbooksService } from './textbooks.service'
import type { AuthUser } from '../auth/auth.service'
import { isAdmin, visibleTo } from '../auth/visibility'

@Controller('textbooks')
export class TextbooksController {
  constructor(private readonly textbooksService: TextbooksService) {}

  /** `GET /textbooks` — published ones (public). `?all=true` for the admin page. */
  @Get()
  list(@CurrentUser() user: AuthUser | null, @Query('all') all?: string) {
    return all === 'true' && isAdmin(user) ? this.textbooksService.listAll() : this.textbooksService.listPublished()
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser | null) {
    return visibleTo(user, await this.textbooksService.getById(id), 'errors.textbook.notFound')
  }

  @Post()
  @Authenticated('admin')
  create(@Body() body: CreateTextbookDto) {
    return this.textbooksService.create(body)
  }

  /** Declared before `:id` so 'order' is not parsed as a UUID. */
  @Patch('order')
  @Authenticated('admin')
  reorder(@Body() body: ReorderTextbooksDto) {
    return this.textbooksService.reorder(body.ids)
  }

  @Patch(':id')
  @Authenticated('admin')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() body: UpdateTextbookDto) {
    return this.textbooksService.update(id, body)
  }

  @Delete(':id')
  @Authenticated('admin')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.textbooksService.remove(id)
  }
}
