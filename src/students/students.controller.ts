import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common'

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
