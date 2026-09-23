import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator'

import { SUPPORTED_LANGUAGES } from '../../common/i18n/messages'
import { CONTENT_SLUGS, type ContentSlug } from '../entities/site-content.entity'

/** `PUT /content/:slug/:locale` — the whole block is replaced on every save. */
export class UpsertContentDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string

  @IsOptional()
  @IsString()
  @MaxLength(200000)
  body?: string
}

export class ContentParamsDto {
  @IsIn(CONTENT_SLUGS)
  slug!: ContentSlug

  @IsIn(SUPPORTED_LANGUAGES)
  locale!: string
}