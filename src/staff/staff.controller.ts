import { Authenticated } from '../auth/auth.guard'
import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common'

import { CreateStaffDto, ReorderStaffDto, UpdateStaffDto } from './dto/staff.dto'
import { StaffService } from './staff.service'

@Controller('staff')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  /** `GET /staff` — published members (public). `?all=true` for the admin page. */
  @Get()
  list(@Query('all') all?: string) {
    return all === 'true' ? this.staffService.listAll() : this.staffService.listPublished()
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.staffService.getById(id)
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
