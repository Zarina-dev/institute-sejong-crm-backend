import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common'

import { Authenticated } from '../auth/auth.guard'
import { CreateTextbookDto, UpdateTextbookDto } from './dto/textbook.dto'
import { TextbooksService } from './textbooks.service'

@Controller('textbooks')
export class TextbooksController {
  constructor(private readonly textbooksService: TextbooksService) {}

  /** `GET /textbooks` — published ones (public). `?all=true` for the admin page. */
  @Get()
  list(@Query('all') all?: string) {
    return all === 'true' ? this.textbooksService.listAll() : this.textbooksService.listPublished()
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.textbooksService.getById(id)
  }

  @Post()
  @Authenticated('admin')
  create(@Body() body: CreateTextbookDto) {
    return this.textbooksService.create(body)
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