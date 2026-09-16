import { Body, Controller, Delete, ForbiddenException, Get, NotFoundException, Param, ParseUUIDPipe, Patch, Post, Query, Res } from '@nestjs/common'
import type { Response } from 'express'
import { basename, join } from 'path'

import { Authenticated, CurrentUser } from '../auth/auth.guard'
import type { AuthUser } from '../auth/auth.service'

import { CreateStudentDto } from './dto/create-student.dto'
import { StudentLoginDto, UpdateStudentDto } from './dto/update-student.dto'
import { StudentsService } from './students.service'

@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get()
  async list(@Query('status') status?: string) {
    const students = await this.studentsService.listStudents()
    return status && status !== 'all' ? students.filter((student) => student.status === status) : students
  }

  /**
   * Fresh copy of one student by login id — no password, no admin notes.
   * The student portal polls this so a course approved after sign-in shows
   * up without a re-login.
   */
  @Get(':studentId')
  findOne(@Param('studentId') studentId: string) {
    return this.studentsService.getPublicStudent(studentId)
  }

  /**
   * TOPIK certificates are private: the admin or the student they belong to.
   * Served here rather than statically (see main.ts).
   */
  @Get(':id/topik-files/:fileId')
  @Authenticated()
  async downloadTopikFile(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('fileId') fileId: string,
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
  ) {
    if (user.role !== 'admin' && user.studentId !== id) {
      throw new ForbiddenException('errors.auth.forbidden')
    }

    const student = await this.studentsService.getStudentEntity(id)
    const file = (student.topikFiles ?? []).find((item) => item.id === fileId)

    if (!file?.url) {
      throw new NotFoundException('errors.material.notAvailable')
    }

    res.download(join('uploads', 'documents', basename(file.url)), file.name)
  }

  @Post('login')
  login(@Body() body: StudentLoginDto) {
    return this.studentsService.login(body.studentId, body.password)
  }

  @Post()
  create(@Body() body: CreateStudentDto) {
    return this.studentsService.createStudent(body)
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() body: UpdateStudentDto) {
    return this.studentsService.updateStudent(id, body)
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.studentsService.deleteStudent(id)
  }
}
