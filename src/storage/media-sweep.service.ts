import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'

import { r2Storage, STORED_KINDS, type StoredKind } from './r2-storage.service'

/** An upload younger than this may belong to a form not saved yet. */
const GRACE = 24 * 60 * 60 * 1000
const EVERY = 6 * 60 * 60 * 1000
/** Every stored file is named <uuid>.<ext>, wherever the path to it is written. */
/** A material's storageKey from before R2 is a Windows path (uploads\materials\<file>), hence either slash. */
const REFERENCE = /(images|videos|documents|materials)[\\/]([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-z0-9]+)/gi

export type SweepResult = {
  referenced: number
  removed: Array<{ kind: StoredKind; file: string; bucket: string }>
  kept: number
  skipped?: string
}

/**
 * Removes stored files — images, videos, documents, materials — that no
 * record uses any more, from both R2 buckets. Most files are removed the
 * moment a record lets go of them (a purge from 최근 삭제된 항목, a replaced photo), but some never were:
 * an image taken out of a rich text, a post's old cover, a file uploaded into
 * a form that was then closed. This catches every such case the same way.
 *
 * "Used" is read from the database itself: every row of every table,
 * deleted ones included (a record in the trash still owns its files, so a
 * restore brings them back), searched for <kind>/<uuid>.<ext> — whether a
 * column holds /uploads/images/…, a JSON list of them, or HTML around them.
 * A file younger than a day is left alone, and if the database yields no
 * reference at all the sweep stops rather than empty the storage.
 */
@Injectable()
export class MediaSweepService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(MediaSweepService.name)
  private timer: NodeJS.Timeout | null = null

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  onApplicationBootstrap() {
    // The command-line sweep runs it itself (see sweep-media.ts).
    if (process.env.MEDIA_SWEEP === 'off') return

    void this.sweep().catch((error) => this.logger.error(`Media sweep failed: ${(error as Error).message}`))
    this.timer = setInterval(() => void this.sweep().catch(() => undefined), EVERY)
    this.timer.unref()
  }

  onApplicationShutdown() {
    if (this.timer) clearInterval(this.timer)
  }

  /** Every file name some row mentions, in any table. */
  async referencedFiles() {
    const tables = await this.dataSource.query<Array<{ table_name: string }>>(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`,
    )
    const files = new Set<string>()

    for (const { table_name } of tables) {
      const rows = await this.dataSource.query<Array<{ row: string }>>(`SELECT t::text AS row FROM "${table_name.replace(/"/g, '""')}" t`)
      for (const { row } of rows) {
        for (const match of row.matchAll(REFERENCE)) files.add(match[2].toLowerCase())
      }
    }

    return files
  }

  async sweep({ dryRun = false } = {}): Promise<SweepResult> {
    const referenced = await this.referencedFiles()
    const result: SweepResult = { referenced: referenced.size, removed: [], kept: 0 }

    if (referenced.size === 0) {
      result.skipped = 'no references found in the database — nothing removed'
      this.logger.warn(`Media sweep skipped: ${result.skipped}.`)
      return result
    }

    const storage = r2Storage()
    const cutoff = Date.now() - GRACE

    for (const kind of STORED_KINDS) {
      for (const entry of await storage.list(kind)) {
        if (referenced.has(entry.file.toLowerCase()) || entry.modified.getTime() > cutoff) {
          result.kept += 1
          continue
        }

        result.removed.push({ kind, file: entry.file, bucket: storage.bucketFor(kind) })
        if (!dryRun) await storage.remove(kind, entry.file)
      }
    }

    if (result.removed.length > 0 && !dryRun) {
      this.logger.log(`Removed ${result.removed.length} stored file(s) no record uses.`)
    }

    return result
  }
}
