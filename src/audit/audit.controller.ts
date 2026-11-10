import { Controller, Get, Query, Req } from '@nestjs/common'
import type { Request } from 'express'

import { Authenticated } from '../auth/auth.guard'
import { AuditService, type AuditQuery } from './audit.service'
import { clientIp } from './client-info'

/** 작업 기록 — administrators only: it names who did what, from where. */
@Controller('audit')
@Authenticated('ADMIN')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  list(@Query() query: AuditQuery) {
    return this.audit.list(query)
  }

  /**
   * How this very request would be written down: the address the log
   * records, and what it was taken from. For checking TRUST_PROXY behind a
   * new proxy or host — the log should show the visitor, not the proxy.
   */
  @Get('connection')
  connection(@Req() request: Request) {
    const header = (name: string) => {
      const value = request.headers[name]
      return Array.isArray(value) ? value.join(', ') : (value ?? null)
    }
    return {
      recorded: clientIp(request),
      forwardedFor: header('x-forwarded-for'),
      realIp: header('x-real-ip'),
      peer: request.socket?.remoteAddress ?? null,
      trustProxy: process.env.TRUST_PROXY?.trim() || null,
    }
  }
}
