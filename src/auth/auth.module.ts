import { Global, Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'

import { AccountsModule } from '../accounts/accounts.module'
import { AuthController } from './auth.controller'
import { AuthGuard } from './auth.guard'
import { AuthService } from './auth.service'

/**
 * Global so `AuthGuard` (registered as APP_GUARD) can resolve `AuthService`
 * everywhere. Accounts themselves live in AccountsModule (staff_accounts).
 */
@Global()
@Module({
  imports: [AccountsModule],
  controllers: [AuthController],
  providers: [AuthService, { provide: APP_GUARD, useClass: AuthGuard }],
  exports: [AuthService],
})
export class AuthModule {}
