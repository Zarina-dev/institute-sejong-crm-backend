import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { Course } from './entities/course.entity'

export type TimetableQuery = {
  /** Inclusive ISO dates; default = the current Monday..Sunday. */
  from?: string
  to?: string
  /** Course title (the label students know the group by). */
  courseGroup?: string
  subject?: string
}

/** One generated class on a concrete date. `id` is stable per course/date/slot. */
export type TimetableEntry = {
  id: string
  courseId: string
  date: string
  startTime: string
  endTime: string
  subject: string
  title: string
  teacher: string | null
  classroom: string | null
  courseGroup: string
}

const isoDate = (d: Date) => d.toISOString().slice(0, 10)

/** Monday..Sunday containing `today`, as ISO dates (UTC — dates only, no times). */
export function currentWeek(today = new Date()) {
  const monday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7))
  const sunday = new Date(monday)
  sunday.setUTCDate(monday.getUTCDate() + 6)
  return { from: isoDate(monday), to: isoDate(sunday) }
}

/**
 * The timetable is not stored — it is the published courses' weekly
 * `sessions` unrolled over concrete dates. Editing a course therefore edits
 * the timetable; there is nothing to keep in sync.
 */
@Injectable()
export class TimetableService {
  constructor(
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
  ) {}

  async list(query: TimetableQuery): Promise<TimetableEntry[]> {
    const week = currentWeek()
    const from = query.from ?? week.from
    const to = query.to ?? week.to

    // A week is at most 7 dates × a handful of courses; filtering in memory
    // is simpler than a jsonb query and keeps the SQL boring.
    const courses = await this.courseRepository.find({ where: { isPublished: true } })
    const entries: TimetableEntry[] = []

    for (const course of courses) {
      if (!course.sessions?.length) continue
      if (query.courseGroup && course.title !== query.courseGroup) continue
      if (query.subject && course.subject !== query.subject) continue

      for (const date of eachDate(from, to)) {
        if ((course.startDate && date < course.startDate) || (course.endDate && date > course.endDate)) continue

        const weekday = ((new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7) + 1

        for (const session of course.sessions) {
          if (session.weekday !== weekday) continue

          entries.push({
            id: `${course.id}:${date}:${session.startTime}`,
            courseId: course.id,
            date,
            startTime: session.startTime,
            endTime: session.endTime,
            subject: course.subject,
            title: course.title,
            teacher: course.teacherName,
            classroom: session.classroom ?? course.classroom,
            courseGroup: course.title,
          })
        }
      }
    }

    return entries.sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
  }
}

function* eachDate(from: string, to: string) {
  const cursor = new Date(`${from}T00:00:00Z`)
  const end = new Date(`${to}T00:00:00Z`)

  // Guard against a runaway range from a malformed query.
  for (let i = 0; cursor <= end && i < 62; i += 1) {
    yield isoDate(cursor)
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
}
