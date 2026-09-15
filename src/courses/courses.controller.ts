import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common'

import { CoursesService } from './courses.service'
import {
  CreateApplicationDto,
  CreateCourseDto,
  CreateEnrollmentDto,
  UpdateApplicationStatusDto,
  UpdateCourseDto,
} from './dto/course.dto'

@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get()
  list(@Query('publishedOnly') publishedOnly?: string) {
    return this.coursesService.listCourses({ publishedOnly: publishedOnly === 'true' })
  }

  /* Static segments before `:id` so they are not swallowed by it. */

  @Get('applications/list')
  listApplications() {
    return this.coursesService.listApplications()
  }

  @Get('applications/:id')
  findApplication(@Param('id', ParseUUIDPipe) id: string) {
    return this.coursesService.getApplicationById(id)
  }

  @Post('applications')
  createApplication(@Body() body: CreateApplicationDto) {
    return this.coursesService.createApplication(body)
  }

  @Patch('applications/:id/status')
  updateApplicationStatus(@Param('id', ParseUUIDPipe) id: string, @Body() body: UpdateApplicationStatusDto) {
    return this.coursesService.updateApplicationStatus(id, body.status)
  }

  @Get('enrollments')
  listEnrollments() {
    return this.coursesService.listEnrollments()
  }

  @Post('enrollments')
  createEnrollment(@Body() body: CreateEnrollmentDto) {
    return this.coursesService.createEnrollment(body.studentId, body.courseId)
  }

  @Get('students/:studentId/enrollments')
  listStudentEnrollments(@Param('studentId') studentId: string) {
    return this.coursesService.listStudentEnrollments(studentId)
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.coursesService.getCourseById(id)
  }

  @Post()
  create(@Body() body: CreateCourseDto) {
    return this.coursesService.createCourse(body)
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() body: UpdateCourseDto) {
    return this.coursesService.updateCourse(id, body)
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.coursesService.deleteCourse(id)
  }

  @Post(':id/publish')
  publish(@Param('id', ParseUUIDPipe) id: string) {
    return this.coursesService.setPublished(id, true)
  }

  @Post(':id/unpublish')
  unpublish(@Param('id', ParseUUIDPipe) id: string) {
    return this.coursesService.setPublished(id, false)
  }
}
