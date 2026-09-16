import { Global, Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'

import { StudentsModule } from '../students/students.module'
import { AuthController } from './auth.controller'
import { AuthGuard } from './auth.guard'
import { AuthService } from './auth.service'

/** Global so `AuthGuard` (registered as APP_GUARD) can resolve `AuthService` everywhere. */
@Global()
@Module({
  imports: [StudentsModule],
  controllers: [AuthController],
  providers: [AuthService, { provide: APP_GUARD, useClass: AuthGuard }],
  exports: [AuthService],
})
export class AuthModule {}