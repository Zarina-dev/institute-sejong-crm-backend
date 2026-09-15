import { Controller, Get } from '@nestjs/common'

/**
 * `GET /api/health` — liveness probe for local checks and future deploys.
 * Replaces the scaffold's `GET /api` "hello" endpoint and its service.
 */
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok', timestamp: new Date().toISOString() }
  }
}
