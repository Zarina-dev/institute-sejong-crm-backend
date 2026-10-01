import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { Course } from '../courses/entities/course.entity'
import { AcademicTerm } from './entities/term.entity'
import { TermsController } from './terms.controller'
import { TermsService } from './terms.service'

@Module({
  imports: [TypeOrmModule.forFeature([AcademicTerm, Course])],
  controllers: [TermsController],
  providers: [TermsService],
  // Classes that follow their semester move with it, so the repository is
  // here too — the entity only, not CoursesModule, which would be a cycle.
  // CoursesModule asks it which semester a start date falls in.
  exports: [TermsService],
})
export class TermsModule {}
