import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { Course } from '../courses/entities/course.entity'
import { NewsPost } from '../news/entities/news-post.entity'

/** How many of the newest rows of each table the activity feed merges. */
const RECENT = 12

/**
 * The admin dashboard: four counters and a feed of recent changes. It used
 * to download every course and every news post (bodies included — ~24 MB at
 * twelve years of history) to count them in the browser. The counting is
 * now done where the rows are, and the feed only needs the newest few.
 */
@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(NewsPost)
    private readonly newsRepository: Repository<NewsPost>,
  ) {}

  async summary() {
    const [courses, news, recentCourses, recentNews] = await Promise.all([
      // "Programmes" are the distinct titles, grouped the way the site groups
      // them (features/courses/grouping.ts trims the title).
      this.courseRepository
        .createQueryBuilder('course')
        .select('count(*)', 'total')
        .addSelect('count(*) FILTER (WHERE NOT course.isPublished)', 'drafts')
        .addSelect('count(DISTINCT trim(course.title))', 'programmes')
        .getRawOne<{ total: string; drafts: string; programmes: string }>(),
      this.newsRepository
        .createQueryBuilder('post')
        .select('count(*)', 'total')
        .addSelect('count(*) FILTER (WHERE NOT post.isPublished)', 'drafts')
        .getRawOne<{ total: string; drafts: string }>(),
      this.courseRepository.find({
        select: { id: true, title: true, subject: true, createdAt: true, updatedAt: true },
        order: { updatedAt: 'DESC' },
        take: RECENT,
      }),
      this.newsRepository.find({
        select: { id: true, title: true, category: true, createdAt: true, updatedAt: true },
        order: { updatedAt: 'DESC' },
        take: RECENT,
      }),
    ])

    // count() comes back from PostgreSQL as text (it is a bigint).
    return {
      courses: { total: Number(courses?.total ?? 0), drafts: Number(courses?.drafts ?? 0), programmes: Number(courses?.programmes ?? 0) },
      news: { total: Number(news?.total ?? 0), drafts: Number(news?.drafts ?? 0) },
      recentCourses,
      recentNews,
    }
  }
}
