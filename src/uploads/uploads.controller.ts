import { BadRequestException, Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface'
import { randomUUID } from 'crypto'
import { mkdirSync } from 'fs'
import { diskStorage } from 'multer'
import { extname } from 'path'

import { localized } from '../common/i18n/i18n-exception.filter'

export const IMAGES_DIR = './uploads/images'
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif'] as const
const IMAGE_MIME = /^image\/(jpeg|png|webp|gif)$/

mkdirSync(IMAGES_DIR, { recursive: true })

const imageUploadOptions: MulterOptions = {
  storage: diskStorage({
    destination: IMAGES_DIR,
    filename: (_req, file, cb) => cb(null, `${randomUUID()}${extname(file.originalname || '').toLowerCase()}`),
  }),
  limits: { fileSize: MAX_IMAGE_SIZE, files: 1 },
  // Extension *and* declared mime type must both say "image" — either alone is trivial to spoof.
  fileFilter: (_req, file, cb) => {
    const ext = extname(file.originalname || '').toLowerCase().slice(1)

    if (!(IMAGE_EXTENSIONS as readonly string[]).includes(ext) || !IMAGE_MIME.test(file.mimetype)) {
      cb(new BadRequestException(localized('validation.image.type', { allowed: IMAGE_EXTENSIONS.map((e) => `.${e}`).join(', ') })), false)
      return
    }

    cb(null, true)
  },
}

/**
 * `POST /uploads/images` (multipart, field `file`) → `{ url }`.
 * Used by the rich-text editor (news/announcements) and staff photos.
 * Files are served statically from `/uploads/…` (see main.ts) — outside the
 * `/api` prefix, so the returned URL is site-relative, not API-relative.
 */
@Controller('uploads')
export class UploadsController {
  @Post('images')
  @UseInterceptors(FileInterceptor('file', imageUploadOptions))
  uploadImage(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('validation.image.required')
    }

    return { url: `/uploads/images/${file.filename}`, size: file.size, type: file.mimetype }
  }
}
