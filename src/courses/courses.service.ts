import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { CreateCourseDto, UpdateCourseDto } from './dto/course.dto'
import { weeklyHoursFromSessions } from './session-hours'
import { Course } from './entities/course.entity'

@Injectable()
export class CoursesService {
  constructor(
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
  ) {}

  listCourses({ publishedOnly = false }: { publishedOnly?: boolean } = {}) {
    const query = this.courseRepository.createQueryBuilder('course')

    if (publishedOnly) {
      query.where('course.isPublished = :isPublished', { isPublished: true })
    }

    return query.orderBy('course.title', 'ASC').addOrderBy('course.subject', 'ASC').getMany()
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
    this.assertPeriod(dto.startDate, dto.endDate)

    const course = this.courseRepository.create({
      ...dto,
      level: dto.level ?? null,
      capacity: dto.capacity ?? 0,
      isPublished: dto.isPublished ?? false,
      // 주 시간 defaults to what the weekly pattern adds up to.
      weeklyHours: dto.weeklyHours ?? weeklyHoursFromSessions(dto.sessions),
    })

    return this.courseRepository.save(course)
  }

  async updateCourse(id: string, dto: UpdateCourseDto) {
    this.assertSessions(dto.sessions)
    const course = await this.getCourseById(id)
    this.assertPeriod(dto.startDate ?? course.startDate, dto.endDate ?? course.endDate)
    // Only DTO-whitelisted keys reach here.
    Object.assign(course, dto)

    // Sessions changed and the admin did not type a figure: recompute.
    if (dto.weeklyHours === undefined && dto.sessions) {
      course.weeklyHours = weeklyHoursFromSessions(dto.sessions)
    }

    return this.courseRepository.save(course)
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

  /** ISO dates compare correctly as text, like the HH:mm times below. */
  private assertPeriod(startDate?: string | null, endDate?: string | null) {
    if (startDate && endDate && endDate < startDate) {
      throw new BadRequestException('validation.course.endBeforeStart')
    }
  }

  /** HH:mm strings compare correctly as text. */
  private assertSessions(sessions?: CreateCourseDto['sessions']) {
    if (sessions?.some((session) => session.endTime <= session.startTime)) {
      throw new BadRequestException('validation.schedule.endBeforeStart')
    }
  }
}
