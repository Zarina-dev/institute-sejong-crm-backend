import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common'

import { Authenticated, CurrentUser } from '../auth/auth.guard'
import { CoursesService } from './courses.service'
import { CreateCourseDto, UpdateCourseDto } from './dto/course.dto'
import type { AuthUser } from '../auth/auth.service'
import { isStaff, visibleTo } from '../auth/visibility'

@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  /**
   * Public catalogue; `?publishedOnly=true` is what the site uses, and
   * what anyone but the admin gets regardless.
   * `?term=2026-2` narrows it to one semester and `?category=culture` to one
   * list — every page shows a single semester, so it should not download
   * every class the institute has ever run to show one.
   */
  @Get()
  list(
    @CurrentUser() user: AuthUser | null,
    @Query('publishedOnly') publishedOnly?: string,
    @Query('term') term?: string,
    @Query('category') category?: string,
  ) {
    return this.coursesService.listCourses({
      publishedOnly: publishedOnly === 'true' || !isStaff(user),
      term: (typeof term === 'string' && term.trim()) || undefined,
      category: category === 'language' || category === 'culture' ? category : undefined,
    })
  }

  /**
   * `GET /courses/terms?publishedOnly=true&category=culture` — how many
   * classes each semester has, so a page's semester picker can grey out the
   * ones it would show empty. Declared before `:id`, which would otherwise
   * take "terms" for an id.
   */
  @Get('terms')
  termCounts(@CurrentUser() user: AuthUser | null, @Query('publishedOnly') publishedOnly?: string, @Query('category') category?: string) {
    return this.coursesService.countByTerm({
      publishedOnly: publishedOnly === 'true' || !isStaff(user),
      category: category === 'language' || category === 'culture' ? category : undefined,
    })
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser | null) {
    return visibleTo(user, await this.coursesService.getCourseById(id), 'errors.course.notFound')
  }

  @Post()
  @Authenticated()
  create(@Body() body: CreateCourseDto) {
    return this.coursesService.createCourse(body)
  }

  @Patch(':id')
  @Authenticated()
  update(@Param('id', ParseUUIDPipe) id: string, @Body() body: UpdateCourseDto) {
    return this.coursesService.updateCourse(id, body)
  }

  @Delete(':id')
  @Authenticated()
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.coursesService.deleteCourse(id)
  }

  @Post(':id/publish')
  @Authenticated()
  publish(@Param('id', ParseUUIDPipe) id: string) {
    return this.coursesService.setPublished(id, true)
  }

  @Post(':id/unpublish')
  @Authenticated()
  unpublish(@Param('id', ParseUUIDPipe) id: string) {
    return this.coursesService.setPublished(id, false)
  }
}
