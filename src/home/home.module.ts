import { Module } from '@nestjs/common'

import { CoursesModule } from '../courses/courses.module'
import { NewsModule } from '../news/news.module'
import { TermsModule } from '../terms/terms.module'
import { HomeController } from './home.controller'

/** `GET /api/home`: the home page's data in one request (see HomeController). */
@Module({
  imports: [TermsModule, NewsModule, CoursesModule],
  controllers: [HomeController],
})
export class HomeModule {}
