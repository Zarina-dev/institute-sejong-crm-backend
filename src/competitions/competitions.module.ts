import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { CompetitionsController } from './competitions.controller'
import { CompetitionsService } from './competitions.service'
import { Competition } from './entities/competition.entity'

@Module({
  imports: [TypeOrmModule.forFeature([Competition])],
  controllers: [CompetitionsController],
  providers: [CompetitionsService],
})
export class CompetitionsModule {}
