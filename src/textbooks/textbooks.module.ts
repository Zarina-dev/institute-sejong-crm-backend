import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { Textbook } from './entities/textbook.entity'
import { TextbooksController } from './textbooks.controller'
import { TextbooksService } from './textbooks.service'

@Module({
  imports: [TypeOrmModule.forFeature([Textbook])],
  controllers: [TextbooksController],
  providers: [TextbooksService],
})
export class TextbooksModule {}