import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { NewsPost } from './entities/news-post.entity'
import { NewsController } from './news.controller'
import { NewsService } from './news.service'

@Module({
  imports: [TypeOrmModule.forFeature([NewsPost])],
  controllers: [NewsController],
  providers: [NewsService],
})
export class NewsModule {}
