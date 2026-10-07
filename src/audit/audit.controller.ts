import { Controller, Get, Query } from '@nestjs/common'

import { Authenticated } from '../auth/auth.guard'
import { AuditService, type AuditQuery } from './audit.service'

/** 작업 기록 — admin only. */
@Controller('audit')
@Authenticated('admin')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  list(@Query() query: AuditQuery) {
    return this.audit.list(query)
  }
}
