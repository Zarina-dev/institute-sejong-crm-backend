import { Module } from '@nestjs/common'

import { MediaSweepService } from './media-sweep.service'

/**
 * The orphan sweep for images and videos. Storage itself (media-storage.ts)
 * is a plain singleton, since the uploads controller and every service that
 * drops a file use it outside dependency injection.
 */
@Module({
  providers: [MediaSweepService],
  exports: [MediaSweepService],
})
export class StorageModule {}
