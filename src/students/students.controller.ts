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
import { StudentsService, CreateStudentInput } from './students.service'

@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get()
  async list(@Query('status') status?: string) {
    const students = await this.studentsService.listStudents()

    if (status && status !== 'all') {
      return students.filter((student) => student.status === status)
    }

    return students
  }

  @Post('login')
  async login(@Body() body: { studentId: string; password: string }) {
    const result = await this.studentsService.validateStudentLogin(body.studentId, body.password)

    if (!result.valid) {
      return { valid: false, reason: result.reason }
    }

    return { valid: true, student: result.student }
  }

  @Post()
  async create(@Body() body: CreateStudentInput) {
    return this.studentsService.createStudent(body)
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: Partial<CreateStudentInput>) {
    return this.studentsService.updateStudent(id, body)
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.studentsService.deleteStudent(id)
  }
}
