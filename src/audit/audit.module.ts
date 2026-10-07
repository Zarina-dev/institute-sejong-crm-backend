import { Global, Module } from '@nestjs/common'
import { APP_INTERCEPTOR } from '@nestjs/core'
import { TypeOrmModule } from '@nestjs/typeorm'

import { AuditController } from './audit.controller'
import { AuditInterceptor } from './audit.interceptor'
import { AuditService } from './audit.service'
import { AuditLogEntry } from './entities/audit-log.entity'

/**
 * 작업 기록: the interceptor records every change made through the API;
 * AuditService is global so jobs (the 30-day purge) can record theirs.
 */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([AuditLogEntry])],
  controllers: [AuditController],
  providers: [AuditService, { provide: APP_INTERCEPTOR, useClass: AuditInterceptor }],
  exports: [AuditService],
})
export class AuditModule {}
