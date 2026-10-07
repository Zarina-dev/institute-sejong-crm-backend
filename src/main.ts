import { join } from 'node:path'

import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { NestExpressApplication } from '@nestjs/platform-express'
import type { NextFunction, Request, Response } from 'express'

import { AppModule } from './app.module'
import { I18nExceptionFilter } from './common/i18n/i18n-exception.filter'
import { MEDIA_KINDS, parseMediaUrl, r2Storage } from './storage/r2-storage.service'

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule)

  app.setGlobalPrefix('api')

  // First, so the static images below answer with CORS headers too: the
  // 회의록 PDF draws the page — images included — onto a canvas, which a
  // cross-origin image without them would taint.
  app.enableCors({
    origin: true,
    credentials: true,
    allowedHeaders: ['Content-Type', 'Accept-Language', 'Authorization'],
  })

  // Uploaded images and videos are plain static files outside the API
  // prefix, so <img src="/uploads/images/…"> just works. Only those folders
  // are public: learning materials and student documents live next to them
  // but are served through authenticated API routes.
  for (const kind of MEDIA_KINDS) {
    app.useStaticAssets(join(process.cwd(), 'uploads', kind), { prefix: `/uploads/${kind}/`, maxAge: '7d', immutable: true })
  }

  // With R2, a file that is not (or no longer) on this disk lives there: the
  // same path answers with a permanent redirect to its public address, so
  // every stored /uploads/… path keeps working. The site itself links to R2
  // directly (VITE_MEDIA_BASE_URL) and skips this hop.
  // Created here so a missing R2 setting stops the API at start.
  const storage = r2Storage()
  app.use((request: Request, response: Response, next: NextFunction) => {
    const media = request.method === 'GET' || request.method === 'HEAD' ? parseMediaUrl(request.path) : null
    const target = media ? storage.publicUrl(media.kind, media.file) : null
    if (target) {
      response.redirect(301, target)
      return
    }
    next()
  })

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )

  // Every HttpException leaves through here: message keys become text in
  // the language of the request's Accept-Language header.
  app.useGlobalFilters(new I18nExceptionFilter())

  await app.listen(process.env.PORT || 3000)
}

void bootstrap()
