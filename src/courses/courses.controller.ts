import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common'
import { CoursesService, CreateApplicationInput, CreateCourseInput } from './courses.service'

@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get()
  async list(@Query('publishedOnly') publishedOnly?: string) {
    return this.coursesService.listCourses({ publishedOnly: publishedOnly === 'true' })
  }

  @Get('applications/list')
  async listApplications() {
    return this.coursesService.listApplications()
  }

  @Get('applications/:id')
  async findApplication(@Param('id') id: string) {
    return this.coursesService.getApplicationById(id)
  }

  @Get('enrollments')
  async listEnrollments() {
    return this.coursesService.listEnrollments()
  }

  @Get('students/:studentId/enrollments')
  async listStudentEnrollments(@Param('studentId') studentId: string) {
    return this.coursesService.listStudentEnrollments(studentId)
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.coursesService.getCourseById(id)
  }

  @Post()
  async create(@Body() body: CreateCourseInput) {
    return this.coursesService.createCourse(body)
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: Partial<CreateCourseInput>) {
    return this.coursesService.updateCourse(id, body)
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.coursesService.deleteCourse(id)
  }

  @Post(':id/publish')
  async publish(@Param('id') id: string) {
    return this.coursesService.publishCourse(id)
  }

  @Post(':id/unpublish')
  async unpublish(@Param('id') id: string) {
    return this.coursesService.unpublishCourse(id)
  }

  @Post('applications')
  async createApplication(@Body() body: CreateApplicationInput) {
    return this.coursesService.createApplication(body)
  }

  @Patch('applications/:id/status')
  async updateApplicationStatus(@Param('id') id: string, @Body() body: { status: 'approved' | 'rejected' | 'enrolled' }) {
    return this.coursesService.updateApplicationStatus(id, body.status)
  }

  @Post('enrollments')
  async createEnrollment(@Body() body: { studentId: string; courseId: string }) {
    return this.coursesService.createEnrollment(body.studentId, body.courseId)
  }
}
