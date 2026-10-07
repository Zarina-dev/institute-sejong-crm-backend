import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common'
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm'
import { DataSource, LessThan, Repository } from 'typeorm'

import { TRASH_KINDS } from '../trash/trash.registry'
import { AUDIT_ACTIONS, AuditLogEntry, type AuditAction } from './entities/audit-log.entity'

/** How long the journal keeps an entry. */
const KEEP_DAYS = 365
const DAY = 24 * 60 * 60 * 1000

export type AuditQuery = { page?: number; limit?: number; action?: string; type?: string; q?: string }

export type AuditEntry = Pick<AuditLogEntry, 'actor' | 'action' | 'entityType' | 'entityId' | 'label' | 'changes' | 'ip'>

@Injectable()
export class AuditService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(AuditService.name)
  private timer: NodeJS.Timeout | null = null

  constructor(
    @InjectRepository(AuditLogEntry) private readonly entries: Repository<AuditLogEntry>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  onApplicationBootstrap() {
    void this.purgeOld()
    this.timer = setInterval(() => void this.purgeOld(), DAY)
    this.timer.unref()
  }

  onApplicationShutdown() {
    if (this.timer) clearInterval(this.timer)
  }

  /**
   * Writes an entry. Never fails the request it describes: a change that
   * was made stays made even if its journal line could not be written.
   */
  async record(entry: Partial<AuditEntry> & { actor: string; action: AuditAction }) {
    try {
      await this.entries.insert({
        actor: entry.actor.slice(0, 120),
        action: entry.action,
        entityType: entry.entityType ?? null,
        entityId: entry.entityId?.slice(0, 80) ?? null,
        label: (entry.label ?? '').slice(0, 300),
        changes: entry.changes ?? [],
        ip: entry.ip?.slice(0, 64) ?? null,
      })
    } catch (error) {
      this.logger.warn(`Could not write an audit entry (${entry.action} ${entry.entityType ?? ''}): ${(error as Error).message}`)
    }
  }

  /** Newest first, a page at a time; filters are parameters, never spliced into SQL. */
  async list(query: AuditQuery) {
    const page = Math.max(1, Number(query.page) || 1)
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 50))
    const qb = this.entries.createQueryBuilder('entry')

    if (query.action && (AUDIT_ACTIONS as readonly string[]).includes(query.action)) {
      qb.andWhere('entry.action = :action', { action: query.action })
    }
    if (query.type) {
      qb.andWhere('entry.entityType = :type', { type: query.type })
    }
    const search = query.q?.trim()
    if (search) {
      qb.andWhere('(entry.label ILIKE :search OR entry.actor ILIKE :search)', { search: `%${search.replace(/[\\%_]/g, '\\$&')}%` })
    }

    const [items, total] = await qb
      .orderBy('entry.at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount()

    return { items, total, page, limit }
  }

  /**
   * A record's name, read now — for a delete, restore or purge, whose
   * response does not carry the record. Deleted rows count (withDeleted).
   */
  async labelOf(type: string, id: string) {
    const kind = TRASH_KINDS.find((candidate) => candidate.type === type)
    if (!kind) return ''
    try {
      const row = await this.dataSource.getRepository(kind.entity).findOne({ withDeleted: true, where: { id } })
      return row ? kind.label(row) : ''
    } catch {
      return ''
    }
  }

  /** A record's name from the record itself, as a create or an update returns it. */
  labelFrom(type: string | null, body: unknown) {
    if (!body || typeof body !== 'object') return ''
    const row = body as Record<string, unknown>
    const kind = TRASH_KINDS.find((candidate) => candidate.type === type)
    const label = kind ? kind.label(row) : (row.title ?? row.name ?? row.slug ?? '')
    return typeof label === 'string' ? label : String(label ?? '')
  }

  /** Entries older than a year go. */
  async purgeOld() {
    try {
      const { affected } = await this.entries.delete({ at: LessThan(new Date(Date.now() - KEEP_DAYS * DAY)) })
      if (affected) this.logger.log(`Removed ${affected} audit entr${affected === 1 ? 'y' : 'ies'} older than ${KEEP_DAYS} days.`)
    } catch (error) {
      this.logger.warn(`Audit retention failed: ${(error as Error).message}`)
    }
  }
}
