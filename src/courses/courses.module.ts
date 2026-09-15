import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Course } from './course.entity'
import { CourseApplication } from './course-application.entity'
import { Enrollment } from './enrollment.entity'
import { CoursesController } from './courses.controller'
import { CoursesService } from './courses.service'
import { Student } from '../students/student.entity'

@Module({
  imports: [TypeOrmModule.forFeature([Course, CourseApplication, Enrollment, Student])],
  controllers: [CoursesController],
  providers: [CoursesService],
  exports: [CoursesService],
})
export class CoursesModule {}
