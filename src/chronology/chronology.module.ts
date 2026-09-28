import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { ChronologyController } from './chronology.controller'
import { ChronologyService } from './chronology.service'
import { ChronologyEntry } from './entities/chronology-entry.entity'

@Module({
  imports: [TypeOrmModule.forFeature([ChronologyEntry])],
  controllers: [ChronologyController],
  providers: [ChronologyService],
})
export class ChronologyModule {}
