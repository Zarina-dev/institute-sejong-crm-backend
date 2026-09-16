import { BadRequestException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import * as bcrypt from 'bcryptjs'
import { Repository } from 'typeorm'

import { removeUploadedFile } from '../common/uploaded-files'
import { CreateStudentDto } from './dto/create-student.dto'
import { UpdateStudentDto } from './dto/update-student.dto'
import { Student } from './entities/student.entity'

@Injectable()
export class StudentsService {
  constructor(
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
  ) {}

  /** Admin listing — includes password and notes by design (admin-only screen). */
  listStudents() {
    return this.studentRepository.find({ order: { createdAt: 'DESC' } })
  }

  async getStudentByStudentId(studentId: string) {
    const student = await this.studentRepository.findOne({ where: { studentId } })

    if (!student) {
      throw new NotFoundException('errors.student.notFound')
    }

    return student
  }

  /** What the student portal may see: no password, no admin notes. */
  async getPublicStudent(studentId: string) {
    return this.toPublic(await this.getStudentByStudentId(studentId.trim()))
  }

  async createStudent(dto: CreateStudentDto) {
    const studentId = dto.studentId.trim()
    await this.assertStudentIdFree(studentId)

    const student = this.studentRepository.create({
      ...dto,
      studentId,
      password: dto.password?.trim() || this.generatePassword(studentId),
      status: dto.status ?? 'active',
      admissionDate: dto.admissionDate ?? null,
      notes: dto.notes?.trim() || null,
      topikFiles: dto.topikFiles ?? [],
    })

    return this.studentRepository.save(student)
  }

  /** Full row by primary key (admin/internal use). */
  async getStudentEntity(id: string) {
    const student = await this.studentRepository.findOne({ where: { id } })

    if (!student) {
      throw new NotFoundException('errors.student.notFound')
    }

    return student
  }

  async updateStudent(id: string, dto: UpdateStudentDto) {
    const student = await this.getStudentEntity(id)

    const nextStudentId = dto.studentId?.trim()

    if (nextStudentId && nextStudentId !== student.studentId) {
      await this.assertStudentIdFree(nextStudentId, id)
    }

    // An empty password field in the edit form means "keep the current one".
    const { password, ...rest } = dto

    // Files dropped from the list must not linger on disk.
    const keptUrls = new Set((dto.topikFiles ?? student.topikFiles ?? []).map((file) => file.url))
    const removedFiles = dto.topikFiles ? (student.topikFiles ?? []).filter((file) => file.url && !keptUrls.has(file.url)) : []

    Object.assign(student, {
      ...rest,
      ...(nextStudentId ? { studentId: nextStudentId } : {}),
      ...(password?.trim() ? { password: password.trim() } : {}),
      ...(dto.notes !== undefined ? { notes: dto.notes?.trim() || null } : {}),
    })

    const saved = await this.studentRepository.save(student)
    await Promise.all(removedFiles.map((file) => removeUploadedFile(file.url)))

    return saved
  }

  async deleteStudent(id: string) {
    const student = await this.studentRepository.findOne({ where: { id } })

    if (!student) {
      throw new NotFoundException('errors.student.notFound')
    }

    await this.studentRepository.remove(student)
    await Promise.all((student.topikFiles ?? []).map((file) => removeUploadedFile(file.url)))
    return { success: true }
  }

  /**
   * Resolves to the public student record, or throws 401/403 with a message
   * key — the exception filter localises it. A failed login used to come back
   * as HTTP 200 `{ valid: false, reason }`, which no HTTP client, cache or
   * filter could tell apart from success.
   */
  async login(studentId: string, password: string) {
    const student = await this.studentRepository.findOne({ where: { studentId: studentId.trim() } })

    const matches =
      student &&
      (student.password.startsWith('$2') ? await bcrypt.compare(password, student.password) : student.password === password)

    if (!student || !matches) {
      throw new UnauthorizedException('errors.login.invalid')
    }

    if (student.status !== 'active') {
      throw new ForbiddenException('errors.student.inactive')
    }

    return { valid: true as const, student: this.toPublic(student) }
  }

  private async assertStudentIdFree(studentId: string, exceptId?: string) {
    const existing = await this.studentRepository.findOne({ where: { studentId } })

    if (existing && existing.id !== exceptId) {
      throw new BadRequestException('errors.student.idTaken')
    }
  }

  private toPublic(student: Student) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, notes, ...rest } = student
    return rest
  }

  private generatePassword(studentId: string) {
    const suffix = studentId.replace(/[^a-zA-Z0-9]/g, '').slice(-4) || '2026'
    return `inst${suffix}`
  }
}
