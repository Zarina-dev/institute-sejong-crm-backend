import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { AccountsController } from './accounts.controller'
import { AccountsService } from './accounts.service'
import { StaffAccount } from './entities/staff-account.entity'

@Module({
  imports: [TypeOrmModule.forFeature([StaffAccount])],
  controllers: [AccountsController],
  providers: [AccountsService],
  exports: [AccountsService],
})
export class AccountsModule {}
