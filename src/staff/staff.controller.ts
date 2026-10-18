import { Authenticated, CurrentUser } from '../auth/auth.guard'
import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common'

import { CreateStaffDto, ReorderStaffDto, UpdateStaffDto } from './dto/staff.dto'
import { StaffService } from './staff.service'
import type { AuthUser } from '../auth/auth.service'
import { isStaff, visibleTo } from '../auth/visibility'

@Controller('staff')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  /** `GET /staff` — published members (public). `?all=true` for the admin page. */
  @Get()
  list(@CurrentUser() user: AuthUser | null, @Query('all') all?: string) {
    return all === 'true' && isStaff(user) ? this.staffService.listAll() : this.staffService.listPublished()
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser | null) {
    return visibleTo(user, await this.staffService.getById(id), 'errors.staff.notFound')
  }

  @Post()
  @Authenticated()
  create(@Body() body: CreateStaffDto) {
    return this.staffService.create(body)
  }

  /** Declared before `:id` so 'order' is not parsed as a UUID. */
  @Patch('order')
  @Authenticated()
  reorder(@Body() body: ReorderStaffDto) {
    return this.staffService.reorder(body.ids)
  }

  @Patch(':id')
  @Authenticated()
  update(@Param('id', ParseUUIDPipe) id: string, @Body() body: UpdateStaffDto) {
    return this.staffService.update(id, body)
  }

  @Delete(':id')
  @Authenticated()
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.staffService.remove(id)
  }
}
