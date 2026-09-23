import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { DEFAULT_LANGUAGE } from '../common/i18n/messages'
import { sanitizeRichText } from '../common/sanitize'
import { UpsertContentDto } from './dto/content.dto'
import { SiteContent, type ContentSlug } from './entities/site-content.entity'

@Injectable()
export class ContentService {
  constructor(
    @InjectRepository(SiteContent)
    private readonly contentRepository: Repository<SiteContent>,
  ) {}

  /**
   * Every block for one language, as `{ slug: { title, body } }`. Missing
   * translations fall back to the institute's default language so a page is
   * never blank just because one locale was not filled in yet.
   */
  async getForLocale(locale: string) {
    const rows = await this.contentRepository.find({ where: [{ locale }, { locale: DEFAULT_LANGUAGE }] })
    const result: Record<string, { title: string; body: string; locale: string }> = {}

    for (const row of rows) {
      const current = result[row.slug]

      // Exact locale wins over the fallback, whatever order rows arrive in.
      if (!current || (current.locale !== locale && row.locale === locale)) {
        result[row.slug] = { title: row.title, body: row.body, locale: row.locale }
      }
    }

    return result
  }

  /** Admin view: every row, so the editor can show which languages are filled. */
  listAll() {
    return this.contentRepository.find({ order: { slug: 'ASC', locale: 'ASC' } })
  }

  async upsert(slug: ContentSlug, locale: string, dto: UpsertContentDto) {
    const existing = await this.contentRepository.findOne({ where: { slug, locale } })
    const row = existing ?? this.contentRepository.create({ slug, locale, title: '', body: '' })

    if (dto.title !== undefined) {
      row.title = dto.title.trim()
    }

    if (dto.body !== undefined) {
      row.body = sanitizeRichText(dto.body)
    }

    return this.contentRepository.save(row)
  }
}