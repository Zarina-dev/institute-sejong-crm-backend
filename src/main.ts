import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { NestExpressApplication } from '@nestjs/platform-express'
import type { NextFunction, Request, Response } from 'express'

import { AppModule } from './app.module'
import { I18nExceptionFilter } from './common/i18n/i18n-exception.filter'
import { parseMediaUrl, r2Storage } from './storage/r2-storage.service'

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule)

  app.setGlobalPrefix('api')

  app.enableCors({
    origin: true,
    credentials: true,
    allowedHeaders: ['Content-Type', 'Accept-Language', 'Authorization'],
  })

  // Every file lives in Cloudflare R2; this server keeps none. A stored
  // /uploads/images|videos/… path asked of the API (an old link, a client
  // that does not know R2) answers with a permanent redirect to its public
  // address. The site links to R2 directly (VITE_MEDIA_BASE_URL). Documents
  // and materials are private and only reachable through their API routes.
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
