import { Controller, Get } from '@nestjs/common'

import { Authenticated } from '../auth/auth.guard'
import { DashboardService } from './dashboard.service'

@Controller('dashboard')
@Authenticated('admin')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /** Counters and the newest changes for the admin landing page. */
  @Get()
  summary() {
    return this.dashboardService.summary()
  }
}
