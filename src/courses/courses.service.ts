import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Course } from './entities/course.entity'
import { CourseApplication } from './entities/course-application.entity'
import { Enrollment } from './entities/enrollment.entity'
import { Student } from '../students/entities/student.entity'
import { CreateApplicationDto, CreateCourseDto, UpdateCourseDto } from './dto/course.dto'

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
      throw new NotFoundException('errors.course.notFound')
    }

    return course
  }

  createCourse(dto: CreateCourseDto) {
    this.assertSessions(dto.sessions)

    const course = this.courseRepository.create({
      ...dto,
      level: dto.level ?? null,
      capacity: dto.capacity ?? 0,
      isPublished: dto.isPublished ?? false,
    })

    return this.courseRepository.save(course)
  }

  async updateCourse(id: string, dto: UpdateCourseDto) {
    this.assertSessions(dto.sessions)
    const course = await this.getCourseById(id)
    // Only DTO-whitelisted keys reach here.
    Object.assign(course, dto)
    return this.courseRepository.save(course)
  }

  /** HH:mm strings compare correctly as text. */
  private assertSessions(sessions?: CreateCourseDto['sessions']) {
    if (sessions?.some((session) => session.endTime <= session.startTime)) {
      throw new BadRequestException('validation.schedule.endBeforeStart')
    }
  }

  async deleteCourse(id: string) {
    const course = await this.getCourseById(id)
    await this.courseRepository.remove(course)
    return { success: true }
  }

  async setPublished(id: string, isPublished: boolean) {
    const course = await this.getCourseById(id)
    course.isPublished = isPublished
    return this.courseRepository.save(course)
  }

  /**
   * Relations load through the real foreign keys now (see the entity note),
   * so the per-row `getCourseById` fallback that used to live here — an N+1
   * workaround for join columns that were always NULL — is gone.
   */
  async listApplications() {
    return this.applicationRepository.find({
      order: { createdAt: 'DESC' },
      relations: { course: true, student: true },
    })
  }

  async getApplicationById(id: string) {
    const application = await this.applicationRepository.findOne({
      where: { id },
      relations: { course: true, student: true },
    })

    if (!application) {
      throw new NotFoundException('errors.application.notFound')
    }

    return application
  }

  async createApplication(dto: CreateApplicationDto) {
    const course = await this.getCourseById(dto.courseId)

    if (!course.isPublished) {
      throw new BadRequestException('errors.course.notPublished')
    }

    // One live application per (student, course): a second click on "apply"
    // returns the existing one instead of creating a duplicate.
    if (dto.studentId) {
      const existing = await this.applicationRepository.findOne({
        where: { studentId: dto.studentId, courseId: dto.courseId },
        relations: { course: true, student: true },
      })

      if (existing && existing.status !== 'rejected') {
        return existing
      }
    }

    // A signed-in student's contact details come from their record, so an
    // outdated e-mail on the student never blocks the application itself.
    const student = dto.studentId ? await this.studentRepository.findOne({ where: { id: dto.studentId } }) : null

    if (dto.studentId && !student) {
      throw new NotFoundException('errors.student.notFound')
    }

    const application = this.applicationRepository.create({
      ...dto,
      applicantName: dto.applicantName?.trim() || student?.name || '',
      applicantEmail: dto.applicantEmail?.trim() || student?.email || '',
      phone: dto.phone ?? student?.phone ?? null,
      status: 'pending',
      studentId: dto.studentId ?? null,
      documents: dto.documents ?? [],
    })

    return this.applicationRepository.save(application)
  }

  async updateApplicationStatus(id: string, status: 'approved' | 'rejected' | 'enrolled') {
    const application = await this.getApplicationById(id)

    application.status = status

    const course = application.course

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

  listEnrollments() {
    return this.enrollmentRepository.find({
      order: { createdAt: 'DESC' },
      relations: { course: true, student: true },
    })
  }

  async createEnrollment(studentId: string, courseId: string) {
    const student = await this.studentRepository.findOne({ where: { id: studentId } })

    if (!student) {
      throw new NotFoundException('errors.student.notFound')
    }

    const course = await this.getCourseById(courseId)

    const existing = await this.enrollmentRepository.findOne({ where: { studentId, courseId } })

    if (existing) {
      throw new BadRequestException('errors.enrollment.duplicate')
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
      throw new NotFoundException('errors.student.notFound')
    }

    return this.enrollmentRepository.find({
      where: { studentId: student.id },
      relations: ['course'],
      order: { createdAt: 'DESC' },
    })
  }
}
