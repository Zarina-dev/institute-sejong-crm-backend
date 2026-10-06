import { Module } from '@nestjs/common'

import { TermsModule } from '../terms/terms.module'
import { TrashController } from './trash.controller'
import { TrashService } from './trash.service'

/**
 * Reads every trashable entity through the DataSource (see trash.registry),
 * so it needs no repositories of its own — only TermsService, for the checks
 * a semester needs before it can come back.
 */
@Module({
  imports: [TermsModule],
  controllers: [TrashController],
  providers: [TrashService],
})
export class TrashModule {}
