import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Student } from './entities/student.entity'
import * as bcrypt from 'bcryptjs'

export type CreateStudentInput = {
  name: string
  studentId: string
  email: string
  phone: string
  course: string
  level: string
  admissionDate?: string | null
  status?: 'active' | 'inactive'
  password?: string
  topikFiles?: Array<{
    id: string
    name: string
    size: number
    type: string
  }>
}

@Injectable()
export class StudentsService {
  constructor(
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
  ) {}

  async listStudents() {
    const students = await this.studentRepository.find({ order: { createdAt: 'DESC' } })

    return students.map((student) => ({
      ...student,
      password: student.password,
    }))
  }

  async getStudentByStudentId(studentId: string) {
    const student = await this.studentRepository.findOne({ where: { studentId } })

    if (!student) {
      throw new NotFoundException('Student not found')
    }

    return student
  }

  async createStudent(input: CreateStudentInput) {
    const normalizedId = input.studentId.trim()
    const normalizedPassword = input.password?.trim() || this.generatePassword(normalizedId)

    if (!normalizedId) {
      throw new BadRequestException('studentId is required')
    }

    if (await this.studentRepository.findOne({ where: { studentId: normalizedId } })) {
      throw new BadRequestException('이미 사용 중인 학생 ID입니다.')
    }

    const student = this.studentRepository.create({
      ...input,
      studentId: normalizedId,
      password: normalizedPassword,
      status: input.status ?? 'active',
      admissionDate: input.admissionDate ?? null,
      topikFiles: input.topikFiles ?? [],
    })

    const saved = await this.studentRepository.save(student)

    return {
      ...saved,
      password: normalizedPassword,
    }
  }

  async updateStudent(id: string, input: Partial<CreateStudentInput>) {
    const student = await this.studentRepository.findOne({ where: { id } })

    if (!student) {
      throw new NotFoundException('Student not found')
    }

    if (input.studentId && input.studentId.trim() !== student.studentId) {
      const existing = await this.studentRepository.findOne({ where: { studentId: input.studentId.trim() } })
      if (existing && existing.id !== id) {
        throw new BadRequestException('이미 사용 중인 학생 ID입니다.')
      }
    }

    Object.assign(student, {
      ...input,
      studentId: input.studentId?.trim() ?? student.studentId,
      password: input.password ? input.password.trim() : student.password,
      topikFiles: input.topikFiles ?? student.topikFiles,
      admissionDate: input.admissionDate ?? student.admissionDate,
    })

    const saved = await this.studentRepository.save(student)

    return {
      ...saved,
      password: saved.password,
    }
  }

  async deleteStudent(id: string) {
    const student = await this.studentRepository.findOne({ where: { id } })

    if (!student) {
      throw new NotFoundException('Student not found')
    }

    await this.studentRepository.remove(student)

    return { success: true }
  }

  async validateStudentLogin(studentId: string, password: string) {
    const student = await this.studentRepository.findOne({ where: { studentId } })

    if (!student) {
      return { valid: false, reason: '학생 ID 또는 비밀번호가 올바르지 않습니다.' }
    }

    if (student.status !== 'active') {
      return { valid: false, reason: '비활동 상태의 학생은 사이트에 접속할 수 없습니다.' }
    }

    const matchesPlainText = student.password === password
    const matchesHash = student.password.startsWith('$2') && (await bcrypt.compare(password, student.password))

    if (!matchesPlainText && !matchesHash) {
      return { valid: false, reason: '학생 ID 또는 비밀번호가 올바르지 않습니다.' }
    }

    return {
      valid: true,
      student: this.sanitizeStudent(student),
    }
  }

  private sanitizeStudent(student: Student) {
    const { password, ...rest } = student

    return rest
  }

  private generatePassword(studentId: string) {
    const suffix = studentId.replace(/[^a-zA-Z0-9]/g, '').slice(-4) || '2026'
    return `inst${suffix}`
  }
}
