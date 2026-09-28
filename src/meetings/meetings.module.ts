import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { Meeting } from './entities/meeting.entity'
import { MeetingsController } from './meetings.controller'
import { MeetingsService } from './meetings.service'

@Module({
  imports: [TypeOrmModule.forFeature([Meeting])],
  controllers: [MeetingsController],
  providers: [MeetingsService],
})
export class MeetingsModule {}
