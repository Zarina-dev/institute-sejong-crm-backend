import { Controller, Get } from '@nestjs/common'

import { CoursesService } from '../courses/courses.service'
import { TimetableService } from '../courses/timetable.service'
import { NewsService } from '../news/news.service'
import { TermsService } from '../terms/terms.service'

/** The institute's calendar: "today" is Osh's, wherever the server runs. */
const TIME_ZONE = 'Asia/Bishkek'
/** As many news cards and timetable days as the home page shows (HomePage.tsx). */
const NEWS_ON_HOME = 6
const TIMETABLE_DAYS = 14

const isoDate = (date: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)

/**
 * Everything the home page shows, in one answer (and one cache entry).
 *
 * Separately the page needed the semester first and only then its courses —
 * two round trips in a row. Here the server picks the semester the same way
 * the page does (`homeTerm` in frontend/src/features/terms/current.ts: the
 * one in progress, else the newest) and answers all four parts together.
 * Each part is exactly what its own route returns, so the site files them
 * under the usual queries and every other page reuses them.
 */
@Controller('home')
export class HomeController {
  constructor(
    private readonly terms: TermsService,
    private readonly news: NewsService,
    private readonly courses: CoursesService,
    private readonly timetable: TimetableService,
  ) {}

  @Get()
  async home() {
    const now = new Date()
    const today = isoDate(now)
    const range = { from: today, to: isoDate(new Date(now.getTime() + (TIMETABLE_DAYS - 1) * 86_400_000)) }

    const [terms, news, timetable] = await Promise.all([this.terms.list(), this.news.listPublished(NEWS_ON_HOME), this.timetable.list(range)])
    const term = terms.find((t) => t.startDate <= today && today <= t.endDate) ?? terms[0] ?? null
    const courses = term ? await this.courses.listCourses({ publishedOnly: true, term: term.code }) : []

    return { terms, news, newsLimit: NEWS_ON_HOME, term: term?.code ?? null, courses, range, timetable }
  }
}
