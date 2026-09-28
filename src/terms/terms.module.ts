import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { AcademicTerm } from './entities/term.entity'
import { TermsController } from './terms.controller'
import { TermsService } from './terms.service'

@Module({
  imports: [TypeOrmModule.forFeature([AcademicTerm])],
  controllers: [TermsController],
  providers: [TermsService],
  // CoursesModule asks it which semester a start date falls in.
  exports: [TermsService],
})
export class TermsModule {}
