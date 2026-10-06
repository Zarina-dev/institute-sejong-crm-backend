import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { Course } from '../courses/entities/course.entity'
import { ScheduleEvent } from '../events/entities/schedule-event.entity'
import { AcademicTerm } from './entities/term.entity'
import { TermsController } from './terms.controller'
import { TermsService } from './terms.service'

@Module({
  imports: [TypeOrmModule.forFeature([AcademicTerm, Course, ScheduleEvent])],
  controllers: [TermsController],
  providers: [TermsService],
  // Classes that follow their semester move with it, and events are re-filed
  // when the semesters change, so those repositories are here too — the entity only, not CoursesModule, which would be a cycle.
  // CoursesModule asks it which semester a start date falls in.
  exports: [TermsService],
})
export class TermsModule {}
