import { Body, Controller, Get, Headers, Param, Put, Query } from '@nestjs/common'

import { Authenticated } from '../auth/auth.guard'
import { resolveLanguage } from '../common/i18n/messages'
import { ContentService } from './content.service'
import { ContentParamsDto, UpsertContentDto } from './dto/content.dto'

@Controller('content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  /**
   * `GET /content` — every block for the requested language (`?locale=`, or
   * the Accept-Language header), with a fallback to the default language.
   * `?all=true` returns the raw rows for the admin editor.
   */
  @Get()
  list(@Headers('accept-language') header?: string, @Query('locale') locale?: string, @Query('all') all?: string) {
    if (all === 'true') {
      return this.contentService.listAll()
    }

    return this.contentService.getForLocale(locale || resolveLanguage(header))
  }

  @Put(':slug/:locale')
  @Authenticated('admin')
  upsert(@Param() params: ContentParamsDto, @Body() body: UpsertContentDto) {
    return this.contentService.upsert(params.slug, params.locale, body)
  }
}