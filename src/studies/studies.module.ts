import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { StudyAbroad } from './entities/study-abroad.entity'
import { StudiesController } from './studies.controller'
import { StudiesService } from './studies.service'

@Module({
  imports: [TypeOrmModule.forFeature([StudyAbroad])],
  controllers: [StudiesController],
  providers: [StudiesService],
})
export class StudiesModule {}
