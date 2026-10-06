import { Controller, Delete, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common'

import { Authenticated } from '../auth/auth.guard'
import { TrashService } from './trash.service'

/** 최근 삭제된 항목 — admin only. */
@Controller('trash')
@Authenticated('admin')
export class TrashController {
  constructor(private readonly trashService: TrashService) {}

  @Get()
  list() {
    return this.trashService.list()
  }

  @Post(':type/:id/restore')
  restore(@Param('type') type: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.trashService.restore(type, id)
  }

  @Delete(':type/:id')
  purge(@Param('type') type: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.trashService.purge(type, id)
  }
}
