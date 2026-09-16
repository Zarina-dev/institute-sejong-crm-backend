import type { Course } from './entities/course.entity'

/** "한국어 · 한국어 1" — programme plus class, the label stamped on student records. */
export function courseLabel(course: Pick<Course, 'title' | 'subject'>) {
  return course.subject ? `${course.title} · ${course.subject}` : course.title
}
