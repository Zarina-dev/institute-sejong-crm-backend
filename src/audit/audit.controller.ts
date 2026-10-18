import { Controller, Get, Query } from '@nestjs/common'

import { Authenticated } from '../auth/auth.guard'
import { AuditService, type AuditQuery } from './audit.service'

/** 작업 기록 — administrators only: it names who did what, from where. */
@Controller('audit')
@Authenticated('ADMIN')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  list(@Query() query: AuditQuery) {
    return this.audit.list(query)
  }
}
