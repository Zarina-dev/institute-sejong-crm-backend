import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { localized } from '../common/i18n/i18n-exception.filter'
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
   * period comes from it. A class that does not run the whole semester — a
   * four-week 문화 강좌, say — sets its own dates, and they have to fall
   * inside the term it is filed under, or the filing would be a lie.
   *
   * A class sent with dates and no term still works: the seed data does
   * that, and the term then follows from the start date as before.
   */
  private async resolvePeriod(
    term: string | null | undefined,
    { followsTerm = true, startDate, endDate }: { followsTerm?: boolean | null; startDate?: string; endDate?: string },
  ) {
    const defined = await this.termsService.byCode(term)

    if (followsTerm && defined) {
      return { startDate: defined.startDate, endDate: defined.endDate }
    }

    if (!startDate || !endDate) {
      if (!defined) {
        throw new BadRequestException('validation.course.periodRequired')
      }

      return { startDate: startDate ?? defined.startDate, endDate: endDate ?? defined.endDate }
    }

    if (defined && (startDate < defined.startDate || endDate > defined.endDate)) {
      throw new BadRequestException(
        localized('validation.course.periodOutsideTerm', {
          term: defined.name || defined.code,
          period: `${defined.startDate} ~ ${defined.endDate}`,
        }),
      )
    }

    return { startDate, endDate }
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

    // A request that carries its own dates is not following the term, even
    // if it predates the flag and never said so.
    const followsTerm = dto.followsTerm ?? !(dto.startDate && dto.endDate)
    const period = await this.resolvePeriod(dto.term, { ...dto, followsTerm })
    this.assertPeriod(period.startDate, period.endDate)

    const course = this.courseRepository.create({
      ...dto,
      ...period,
      followsTerm,
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

    // The semester or the kind of period changed: work the dates out again.
    // A request carrying dates alone keeps the older behaviour below, where
    // the dates win and the term follows them.
    if (dto.term !== undefined || dto.followsTerm !== undefined) {
      Object.assign(
        course,
        await this.resolvePeriod(dto.term ?? course.term, {
          followsTerm: course.followsTerm ?? false,
          startDate: dto.startDate ?? (course.followsTerm ? undefined : course.startDate ?? undefined),
          endDate: dto.endDate ?? (course.followsTerm ? undefined : course.endDate ?? undefined),
        }),
      )
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
