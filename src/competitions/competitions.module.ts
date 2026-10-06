import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { GalleryAlbum } from '../gallery/entities/gallery-album.entity'
import { CompetitionsController } from './competitions.controller'
import { CompetitionsService } from './competitions.service'
import { Competition } from './entities/competition.entity'

@Module({
  // GalleryAlbum is read once, to carry the old photo albums over.
  imports: [TypeOrmModule.forFeature([Competition, GalleryAlbum])],
  controllers: [CompetitionsController],
  providers: [CompetitionsService],
})
export class CompetitionsModule {}
