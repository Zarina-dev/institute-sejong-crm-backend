import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { Graduate } from './entities/graduate.entity'
import { GraduatesController } from './graduates.controller'
import { GraduatesService } from './graduates.service'

@Module({
  imports: [TypeOrmModule.forFeature([Graduate])],
  controllers: [GraduatesController],
  providers: [GraduatesService],
})
export class GraduatesModule {}
