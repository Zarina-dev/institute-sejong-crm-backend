import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'

import { AppModule } from './app.module'
import { I18nExceptionFilter } from './common/i18n/i18n-exception.filter'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  app.setGlobalPrefix('api')

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

  app.enableCors({
    origin: true,
    credentials: true,
    allowedHeaders: ['Content-Type', 'Accept-Language'],
  })

  await app.listen(process.env.PORT || 3000)
}

void bootstrap()
