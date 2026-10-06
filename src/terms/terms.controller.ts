import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common'

import { Authenticated } from '../auth/auth.guard'
import { CreateTermDto, UpdateTermDto } from './dto/term.dto'
import { TermsService } from './terms.service'

@Controller('terms')
export class TermsController {
  constructor(private readonly termsService: TermsService) {}

  /** Public: the site's semester picker is built from this. */
  @Get()
  list() {
    return this.termsService.list()
  }

  /** Admin: how many classes and events each semester holds, by code. */
  @Get('usage')
  @Authenticated('admin')
  usage() {
    return this.termsService.usage()
  }

  @Post()
  @Authenticated('admin')
  create(@Body() body: CreateTermDto) {
    return this.termsService.create(body)
  }

  @Patch(':id')
  @Authenticated('admin')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() body: UpdateTermDto) {
    return this.termsService.update(id, body)
  }

  @Delete(':id')
  @Authenticated('admin')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.termsService.remove(id)
  }
}
