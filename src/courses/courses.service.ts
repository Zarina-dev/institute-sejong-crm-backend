import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { CreateCourseDto, UpdateCourseDto } from './dto/course.dto'
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

  /** HH:mm strings compare correctly as text. */
  private assertSessions(sessions?: CreateCourseDto['sessions']) {
    if (sessions?.some((session) => session.endTime <= session.startTime)) {
      throw new BadRequestException('validation.schedule.endBeforeStart')
    }
  }
}
