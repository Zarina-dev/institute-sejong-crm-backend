import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { Course } from '../courses/entities/course.entity'
import { NewsPost } from '../news/entities/news-post.entity'
import { DashboardController } from './dashboard.controller'
import { DashboardService } from './dashboard.service'

@Module({
  imports: [TypeOrmModule.forFeature([Course, NewsPost])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
