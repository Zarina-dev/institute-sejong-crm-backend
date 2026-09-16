import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { Course } from '../courses/entities/course.entity'
import { LearningMaterial } from './entities/learning-material.entity'
import { MaterialsController } from './materials.controller'
import { MaterialsService } from './materials.service'

@Module({
  imports: [TypeOrmModule.forFeature([LearningMaterial, Course])],
  controllers: [MaterialsController],
  providers: [MaterialsService],
  exports: [MaterialsService],
})
export class MaterialsModule {}
