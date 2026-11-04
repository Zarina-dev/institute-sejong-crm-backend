import { Injectable, OnApplicationShutdown } from '@nestjs/common'

import { httpCache } from './http-cache'

/**
 * On SIGTERM (a Railway redeploy) Nest stops accepting connections, lets the
 * requests in flight finish, closes the database pool — and then this closes
 * Redis, so the process ends by itself instead of waiting to be killed.
 */
@Injectable()
export class CacheShutdown implements OnApplicationShutdown {
  async onApplicationShutdown() {
    await httpCache().close()
  }
}
