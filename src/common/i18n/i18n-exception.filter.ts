import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common'
import type { Request, Response } from 'express'

import { resolveLanguage, translateMessage, type MessageKey } from './messages'

/** Payload for an HttpException whose message needs placeholders. */
export type LocalizedMessage = { key: MessageKey; params?: Record<string, string | number> }

export const localized = (key: MessageKey, params?: Record<string, string | number>): LocalizedMessage => ({ key, params })

function isLocalizedMessage(value: unknown): value is LocalizedMessage {
  return typeof value === 'object' && value !== null && typeof (value as LocalizedMessage).key === 'string'
}

/**
 * Translates every HttpException on its way out, using the request's
 * Accept-Language. Handles the three shapes Nest produces:
 *
 * - `new NotFoundException('errors.course.notFound')`         → message: string
 * - `new BadRequestException(localized('…', { ext }))`         → message: {key, params}
 * - ValidationPipe failures                                    → message: string[]
 *
 * Anything that is not a known key passes through untouched, so
 * class-validator's own English defaults and third-party messages still work.
 */
@Catch(HttpException)
export class I18nExceptionFilter implements ExceptionFilter<HttpException> {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const request = ctx.getRequest<Request>()
    const response = ctx.getResponse<Response>()
    const language = resolveLanguage(request.headers['accept-language'])
    const status = exception.getStatus()
    const raw = exception.getResponse()

    const body: Record<string, unknown> = typeof raw === 'string' ? { statusCode: status, message: raw } : { ...(raw as object) }
    const message = body.message

    if (Array.isArray(message)) {
      body.message = message.map((item) => (typeof item === 'string' ? translateMessage(language, item) : item))
    } else if (isLocalizedMessage(message)) {
      body.message = translateMessage(language, message.key, message.params)
    } else if (typeof message === 'string') {
      body.message = translateMessage(language, message)
    }

    body.statusCode = status
    response.status(status).json(body)
  }
}
