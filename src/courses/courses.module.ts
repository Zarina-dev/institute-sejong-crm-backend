import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { CoursesController } from './courses.controller'
import { CoursesService } from './courses.service'
import { Course } from './entities/course.entity'
import { TimetableController } from './timetable.controller'
import { TimetableService } from './timetable.service'

@Module({
  imports: [TypeOrmModule.forFeature([Course])],
  controllers: [CoursesController, TimetableController],
  providers: [CoursesService, TimetableService],
  exports: [CoursesService],
})
export class CoursesModule {}
