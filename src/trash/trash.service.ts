import { BadRequestException, Injectable, Logger, NotFoundException, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource, IsNull, LessThan, Not } from 'typeorm'

import { localized } from '../common/i18n/i18n-exception.filter'
import { AcademicTerm } from '../terms/entities/term.entity'
import { TermsService } from '../terms/terms.service'
import { TRASH_KINDS, type TrashKind } from './trash.registry'

/** How long a deleted record can still be restored. */
const KEEP_DAYS = 30
const DAY = 24 * 60 * 60 * 1000
/** How often expired records are purged (also once on start). */
const PURGE_EVERY = 6 * 60 * 60 * 1000

/**
 * 최근 삭제된 항목 — every record the admin deletes lands here first (each
 * entity has a `deleted_at` column; deleting only sets it). From here it can
 * be restored as it was, files included, or removed for good. Whatever is
 * left for 30 days is removed for good automatically, together with its
 * uploaded files.
 */
@Injectable()
export class TrashService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(TrashService.name)
  private timer: NodeJS.Timeout | null = null

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly termsService: TermsService,
  ) {}

  async onApplicationBootstrap() {
    await this.purgeExpired()
    this.timer = setInterval(() => void this.purgeExpired(), PURGE_EVERY)
    // A pending purge must not keep the process alive on shutdown.
    this.timer.unref()
  }

  onApplicationShutdown() {
    if (this.timer) {
      clearInterval(this.timer)
    }
  }

  /** Everything in the trash, most recently deleted first. */
  async list() {
    const items = await Promise.all(
      TRASH_KINDS.map(async (kind) => {
        const rows = await this.repository(kind).find({ withDeleted: true, where: { deletedAt: Not(IsNull()) } })

        return rows.map((row) => {
          const deletedAt = row.deletedAt as Date

          return {
            type: kind.type,
            id: row.id as string,
            label: kind.label(row),
            detail: kind.detail?.(row) ?? null,
            deletedAt: deletedAt.toISOString(),
            purgeAt: new Date(deletedAt.getTime() + KEEP_DAYS * DAY).toISOString(),
          }
        })
      }),
    )

    return items.flat().sort((a, b) => b.deletedAt.localeCompare(a.deletedAt))
  }

  /** Put a record back exactly as it was, files and all. */
  async restore(type: string, id: string) {
    const kind = this.kind(type)
    const row = await this.deleted(kind, id)

    if (kind.entity === AcademicTerm) {
      await this.assertTermRestorable(row as unknown as AcademicTerm)
    }

    await this.repository(kind).restore(id)

    // A semester coming back changes which semester events fall under.
    if (kind.entity === AcademicTerm) {
      await this.termsService.refileEvents()
    }

    return { success: true }
  }

  /** Remove a record for good, with its uploaded files. */
  async purge(type: string, id: string) {
    const kind = this.kind(type)
    const row = await this.deleted(kind, id)

    await this.repository(kind).delete(id)
    await kind.cleanup?.(row)

    return { success: true }
  }

  /** Records deleted more than 30 days ago go for good. */
  async purgeExpired() {
    const cutoff = new Date(Date.now() - KEEP_DAYS * DAY)
    let purged = 0

    for (const kind of TRASH_KINDS) {
      const rows = await this.repository(kind).find({ withDeleted: true, where: { deletedAt: LessThan(cutoff) } })

      for (const row of rows) {
        await this.repository(kind).delete(row.id)
        await kind.cleanup?.(row)
        purged += 1
      }
    }

    if (purged > 0) {
      this.logger.log(`Removed ${purged} record(s) deleted more than ${KEEP_DAYS} days ago.`)
    }

    return purged
  }

  private kind(type: string) {
    const kind = TRASH_KINDS.find((candidate) => candidate.type === type)

    if (!kind) {
      throw new NotFoundException('errors.trash.notFound')
    }

    return kind
  }

  private repository(kind: TrashKind) {
    return this.dataSource.getRepository(kind.entity)
  }

  /** The record, if it is in the trash — a live record cannot be restored or purged from here. */
  private async deleted(kind: TrashKind, id: string) {
    const row = await this.repository(kind).findOne({ withDeleted: true, where: { id } })

    if (!row || !row.deletedAt) {
      throw new NotFoundException('errors.trash.notFound')
    }

    return row
  }

  /**
   * A semester can come back only if nothing has taken its place meanwhile:
   * no semester in use with the same code, and none covering its dates.
   */
  private async assertTermRestorable(term: AcademicTerm) {
    const taken = await this.dataSource.getRepository(AcademicTerm).findOne({ where: { code: term.code } })

    if (taken) {
      throw new BadRequestException(localized('validation.trash.termTaken', { term: term.code }))
    }

    await this.termsService.assertNoOverlap(term.startDate, term.endDate, term.id)
  }
}
