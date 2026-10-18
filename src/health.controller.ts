import { Controller, Get } from '@nestjs/common'

import { httpCache } from './cache/http-cache'

/**
 * `GET /api/health` — liveness probe for local checks and future deploys.
 * Replaces the scaffold's `GET /api` "hello" endpoint and its service.
 */
@Controller('health')
export class HealthController {
  /** `cache`: where public responses are cached, and whether that store is reachable. */
  @Get()
  check() {
    const { store } = httpCache()
    return { status: 'ok', timestamp: new Date().toISOString(), cache: { store: store.kind, up: store.healthy() } }
  }
}
