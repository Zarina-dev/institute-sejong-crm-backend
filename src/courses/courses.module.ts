import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { Student } from '../students/entities/student.entity'
import { CoursesController } from './courses.controller'
import { CoursesService } from './courses.service'
import { CourseApplication } from './entities/course-application.entity'
import { Course } from './entities/course.entity'
import { Enrollment } from './entities/enrollment.entity'
import { TimetableController } from './timetable.controller'
import { TimetableService } from './timetable.service'

@Module({
  imports: [TypeOrmModule.forFeature([Course, CourseApplication, Enrollment, Student])],
  controllers: [CoursesController, TimetableController],
  providers: [CoursesService, TimetableService],
  exports: [CoursesService],
})
export class CoursesModule {}
