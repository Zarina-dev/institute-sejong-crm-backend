import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Course } from './course.entity'
import { CourseApplication } from './course-application.entity'
import { Enrollment } from './enrollment.entity'
import { Student } from '../students/student.entity'

export type CreateCourseInput = {
  title: string
  description?: string | null
  subject: string
  level?: string | null
  teacherName?: string | null
  schedule?: string | null
  classroom?: string | null
  courseCode?: string | null
  startDate?: string | null
  endDate?: string | null
  capacity?: number
  isPublished?: boolean
}

export type CreateApplicationInput = {
  applicantName: string
  applicantEmail: string
  phone?: string | null
  goal?: string | null
  courseId: string
  studentId?: string | null
  documents?: Array<{
    id: string
    name: string
    size: number
    type: string
    dataUrl?: string
  }>
}

@Injectable()
export class CoursesService {
  constructor(
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(CourseApplication)
    private readonly applicationRepository: Repository<CourseApplication>,
    @InjectRepository(Enrollment)
    private readonly enrollmentRepository: Repository<Enrollment>,
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
  ) {}

  async listCourses({ publishedOnly = false }: { publishedOnly?: boolean } = {}) {
    const query = this.courseRepository.createQueryBuilder('course')

    if (publishedOnly) {
      query.where('course.isPublished = :isPublished', { isPublished: true })
    }

    const courses = await query.orderBy('course.createdAt', 'DESC').getMany()

    return courses
  }

  async getCourseById(id: string) {
    const course = await this.courseRepository.findOne({ where: { id } })

    if (!course) {
      throw new NotFoundException('Course not found')
    }

    return course
  }

  async createCourse(input: CreateCourseInput) {
    if (!input.title || !input.subject) {
      throw new BadRequestException('필수 입력값이 누락되었습니다.')
    }

    const course = this.courseRepository.create({
      ...input,
      level: input.level ?? null,
      capacity: Number(input.capacity ?? 0),
      isPublished: input.isPublished ?? false,
    })

    return this.courseRepository.save(course)
  }

  async updateCourse(id: string, input: Partial<CreateCourseInput>) {
    const course = await this.getCourseById(id)

    Object.assign(course, {
      ...input,
      capacity: input.capacity !== undefined ? Number(input.capacity) : course.capacity,
    })

    return this.courseRepository.save(course)
  }

  async deleteCourse(id: string) {
    const course = await this.getCourseById(id)
    await this.courseRepository.remove(course)
    return { success: true }
  }

  async publishCourse(id: string) {
    const course = await this.getCourseById(id)
    course.isPublished = true
    return this.courseRepository.save(course)
  }

  async unpublishCourse(id: string) {
    const course = await this.getCourseById(id)
    course.isPublished = false
    return this.courseRepository.save(course)
  }

  async listApplications() {
    const applications = await this.applicationRepository.find({
      order: { createdAt: 'DESC' },
      relations: ['course', 'student'],
    })

    const normalized = await Promise.all(
      applications.map(async (application) => ({
        ...application,
        course: application.course ?? (await this.getCourseById(application.courseId)),
        student: application.student,
      })),
    )

    return normalized
  }

  async getApplicationById(id: string) {
    const application = await this.applicationRepository.findOne({
      where: { id },
      relations: ['course', 'student'],
    })

    if (!application) {
      throw new NotFoundException('Application not found')
    }

    return {
      ...application,
      course: application.course ?? (await this.getCourseById(application.courseId)),
      student: application.student,
    }
  }

  async createApplication(input: CreateApplicationInput) {
    if (!input.courseId || !input.applicantName || !input.applicantEmail) {
      throw new BadRequestException('수강 신청에 필요한 정보가 누락되었습니다.')
    }

    const course = await this.getCourseById(input.courseId)

    if (!course.isPublished) {
      throw new BadRequestException('현재 공개 중인 과정만 신청할 수 있습니다.')
    }

    const application = this.applicationRepository.create({
      ...input,
      status: 'pending',
      courseId: input.courseId,
      studentId: input.studentId ?? null,
      documents: input.documents ?? [],
    })

    return this.applicationRepository.save(application)
  }

  async updateApplicationStatus(id: string, status: 'approved' | 'rejected' | 'enrolled') {
    const application = await this.getApplicationById(id)

    application.status = status

    const course = application.course ?? (await this.getCourseById(application.courseId))

    if (status === 'approved' || status === 'enrolled') {
      const studentRecord = application.studentId
        ? await this.studentRepository.findOne({ where: { id: application.studentId } })
        : null

      if (studentRecord) {
        studentRecord.course = course.title
        await this.studentRepository.save(studentRecord)
      }

      if (application.studentId && application.courseId) {
        const existingEnrollment = await this.enrollmentRepository.findOne({
          where: { studentId: application.studentId, courseId: application.courseId },
        })

        if (!existingEnrollment) {
          await this.createEnrollment(application.studentId, application.courseId)
        }
      }
    }

    return this.applicationRepository.save(application)
  }

  async rejectApplication(id: string) {
    return this.updateApplicationStatus(id, 'rejected')
  }

  async approveApplication(id: string) {
    return this.updateApplicationStatus(id, 'approved')
  }

  async listEnrollments() {
    return this.enrollmentRepository.find({
      order: { createdAt: 'DESC' },
      relations: ['course', 'student'],
    })
  }

  async createEnrollment(studentId: string, courseId: string) {
    const student = await this.studentRepository.findOne({ where: { id: studentId } })

    if (!student) {
      throw new NotFoundException('Student not found')
    }

    const course = await this.getCourseById(courseId)

    const existing = await this.enrollmentRepository.findOne({ where: { studentId, courseId } })

    if (existing) {
      throw new BadRequestException('이미 등록된 과정입니다.')
    }

    const enrollment = this.enrollmentRepository.create({
      courseId,
      studentId,
      status: 'active',
    })

    await this.enrollmentRepository.save(enrollment)

    student.course = course.title
    await this.studentRepository.save(student)

    return enrollment
  }

  async listStudentEnrollments(studentId: string) {
    const looksLikeUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(studentId)

    const student = looksLikeUuid
      ? await this.studentRepository.findOne({ where: { id: studentId } })
      : await this.studentRepository.findOne({ where: { studentId } })

    if (!student) {
      throw new NotFoundException('Student not found')
    }

    return this.enrollmentRepository.find({
      where: { studentId: student.id },
      relations: ['course'],
      order: { createdAt: 'DESC' },
    })
  }
}
