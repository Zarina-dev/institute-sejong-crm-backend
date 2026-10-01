import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { TermsService } from '../terms/terms.service'
import { CreateCourseDto, UpdateCourseDto } from './dto/course.dto'
import { weeklyHoursFromSessions } from './session-hours'
import { Course } from './entities/course.entity'

/**
 * Last-resort 학기 guess, used only while the institute has not defined any
 * semester dates yet (March–August → 'YYYY-1', September–February →
 * 'YYYY-2'). Once 학기 관리 holds a row covering the date, that row wins:
 * when a semester runs is the institute's decision, not the calendar's.
 */
export function termFromDate(date: string | null | undefined): string | null {
  if (!date) {
    return null
  }

  const [year, month] = date.split('-').map(Number)

  if (!year || !month) {
    return null
  }

  if (month >= 3 && month <= 8) {
    return `${year}-1`
  }

  return month >= 9 ? `${year}-2` : `${year - 1}-2`
}

@Injectable()
export class CoursesService {
  constructor(
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    private readonly termsService: TermsService,
  ) {}

  /** The institute's own dates first; the month heuristic only if it has none. */
  private async resolveTerm(date: string | null | undefined) {
    return (await this.termsService.codeForDate(date)) ?? termFromDate(date)
  }

  /**
   * A class runs for a semester, so the admin picks the semester and the
   * period comes from it. Dates sent explicitly still win — the seed data
   * and older clients send them — and a class may be entered with dates
   * alone, in which case the term follows from the start date as before.
   */
  private async resolvePeriod(term: string | null | undefined, startDate?: string, endDate?: string) {
    if (startDate && endDate) {
      return { startDate, endDate }
    }

    const defined = await this.termsService.byCode(term)

    if (!defined) {
      throw new BadRequestException('validation.course.periodRequired')
    }

    return { startDate: startDate ?? defined.startDate, endDate: endDate ?? defined.endDate }
  }

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

  async createCourse(dto: CreateCourseDto) {
    this.assertSessions(dto.sessions)

    const period = await this.resolvePeriod(dto.term, dto.startDate, dto.endDate)
    this.assertPeriod(period.startDate, period.endDate)

    const course = this.courseRepository.create({
      ...dto,
      ...period,
      term: dto.term ?? (await this.resolveTerm(period.startDate)),
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

    // Moved to another semester: the period moves with it, unless the dates
    // were sent too.
    if (dto.term && !dto.startDate && !dto.endDate) {
      const defined = await this.termsService.byCode(dto.term)

      if (defined) {
        course.startDate = defined.startDate
        course.endDate = defined.endDate
      }
    }

    // Dates moved and no term was given: follow the new start date.
    if (dto.term === undefined && dto.startDate) {
      course.term = await this.resolveTerm(dto.startDate)
    }

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
