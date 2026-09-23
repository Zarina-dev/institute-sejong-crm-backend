import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { GalleryAlbum } from './entities/gallery-album.entity'
import { GalleryController } from './gallery.controller'
import { GalleryService } from './gallery.service'

@Module({
  imports: [TypeOrmModule.forFeature([GalleryAlbum])],
  controllers: [GalleryController],
  providers: [GalleryService],
})
export class GalleryModule {}