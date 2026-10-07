/**
 * Shows, or removes, the images and videos no record uses (MediaSweepService):
 *
 *   npm run media:sweep            — lists them, removes nothing
 *   npm run media:sweep -- --apply — removes them (R2 and disk)
 *
 * The API does the same by itself on start and every 6 hours.
 */
import { NestFactory } from '@nestjs/core'

import { AppModule } from '../app.module'
import { MediaSweepService } from './media-sweep.service'

async function main() {
  process.env.MEDIA_SWEEP = 'off'
  const apply = process.argv.includes('--apply')
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] })

  try {
    const result = await app.get(MediaSweepService).sweep({ dryRun: !apply })
    console.log(`Referenced by records: ${result.referenced} file(s). Kept: ${result.kept}.`)
    if (result.skipped) console.log(`Skipped: ${result.skipped}.`)
    for (const entry of result.removed) console.log(`  ${apply ? 'removed' : 'unused '} ${entry.where.padEnd(4)} ${entry.kind}/${entry.file}`)
    console.log(apply ? `Removed ${result.removed.length}.` : `${result.removed.length} unused — run with --apply to remove them.`)
  } finally {
    await app.close()
  }
}

void main()
