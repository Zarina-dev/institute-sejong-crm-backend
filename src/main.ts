import { join } from 'node:path'

import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { NestExpressApplication } from '@nestjs/platform-express'

import { AppModule } from './app.module'
import { I18nExceptionFilter } from './common/i18n/i18n-exception.filter'

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

  // Uploaded images (news bodies, staff photos) are plain static files
  // outside the API prefix so <img src="/uploads/images/…"> just works.
  // Only that folder is public: learning materials and student documents
  // live next to it but are served through authenticated API routes.
  app.useStaticAssets(join(process.cwd(), 'uploads', 'images'), {
    prefix: '/uploads/images/',
    maxAge: '7d',
    immutable: true,
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
