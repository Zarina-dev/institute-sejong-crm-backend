import { Authenticated, CurrentUser } from '../auth/auth.guard'
import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common'

import { CreateStaffDto, ReorderStaffDto, UpdateStaffDto } from './dto/staff.dto'
import { StaffService } from './staff.service'
import type { AuthUser } from '../auth/auth.service'
import { isAdmin, visibleTo } from '../auth/visibility'

@Controller('staff')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  /** `GET /staff` — published members (public). `?all=true` for the admin page. */
  @Get()
  list(@CurrentUser() user: AuthUser | null, @Query('all') all?: string) {
    return all === 'true' && isAdmin(user) ? this.staffService.listAll() : this.staffService.listPublished()
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser | null) {
    return visibleTo(user, await this.staffService.getById(id), 'errors.staff.notFound')
  }

  @Post()
  @Authenticated('admin')
  create(@Body() body: CreateStaffDto) {
    return this.staffService.create(body)
  }

  /** Declared before `:id` so 'order' is not parsed as a UUID. */
  @Patch('order')
  @Authenticated('admin')
  reorder(@Body() body: ReorderStaffDto) {
    return this.staffService.reorder(body.ids)
  }

  @Patch(':id')
  @Authenticated('admin')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() body: UpdateStaffDto) {
    return this.staffService.update(id, body)
  }

  @Delete(':id')
  @Authenticated('admin')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.staffService.remove(id)
  }
}
