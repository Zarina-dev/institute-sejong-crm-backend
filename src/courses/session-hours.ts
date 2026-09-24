import type { CourseSessionDto } from './dto/course.dto'

const minutes = (time: string) => {
  const [hours, mins] = time.split(':').map(Number)
  return hours * 60 + mins
}

/**
 * Clock hours a weekly pattern adds up to, rounded to one decimal
 * (월·수 09:00–10:30 → 3). It is only the default for 주 시간: institutes
 * count teaching periods their own way, so the admin can override it.
 */
export function weeklyHoursFromSessions(sessions: CourseSessionDto[] | undefined): number | null {
  if (!sessions?.length) {
    return null
  }

  const total = sessions.reduce((sum, session) => sum + Math.max(0, minutes(session.endTime) - minutes(session.startTime)), 0)
  return Math.round((total / 60) * 10) / 10
}
