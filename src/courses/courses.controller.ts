import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common'

import { Authenticated } from '../auth/auth.guard'
import { CoursesService } from './courses.service'
import { CreateCourseDto, UpdateCourseDto } from './dto/course.dto'

@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  /** Public catalogue; `?publishedOnly=true` is what the site uses. */
  @Get()
  list(@Query('publishedOnly') publishedOnly?: string) {
    return this.coursesService.listCourses({ publishedOnly: publishedOnly === 'true' })
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.coursesService.getCourseById(id)
  }

  @Post()
  @Authenticated('admin')
  create(@Body() body: CreateCourseDto) {
    return this.coursesService.createCourse(body)
  }

  @Patch(':id')
  @Authenticated('admin')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() body: UpdateCourseDto) {
    return this.coursesService.updateCourse(id, body)
  }

  @Delete(':id')
  @Authenticated('admin')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.coursesService.deleteCourse(id)
  }

  @Post(':id/publish')
  @Authenticated('admin')
  publish(@Param('id', ParseUUIDPipe) id: string) {
    return this.coursesService.setPublished(id, true)
  }

  @Post(':id/unpublish')
  @Authenticated('admin')
  unpublish(@Param('id', ParseUUIDPipe) id: string) {
    return this.coursesService.setPublished(id, false)
  }
}
