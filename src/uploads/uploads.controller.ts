import { BadRequestException, Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface'
import { randomUUID } from 'crypto'
import { mkdirSync } from 'fs'
import { diskStorage } from 'multer'
import { extname } from 'path'

import { localized } from '../common/i18n/i18n-exception.filter'

export const IMAGES_DIR = './uploads/images'
export const DOCUMENTS_DIR = './uploads/documents'
export const MAX_UPLOAD_SIZE = 5 * 1024 * 1024

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif'] as const
const IMAGE_MIME = /^image\/(jpeg|png|webp|gif)$/

/** TOPIK certificates and similar: scans or PDFs. */
const DOCUMENT_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'webp'] as const
const DOCUMENT_MIME = /^(application\/pdf|image\/(jpeg|png|webp))$/

mkdirSync(IMAGES_DIR, { recursive: true })
mkdirSync(DOCUMENTS_DIR, { recursive: true })

/**
 * Disk storage with a random file name and a double check on the type:
 * extension *and* declared mime type must both match — either alone is
 * trivial to spoof.
 */
function uploadOptions(dir: string, extensions: readonly string[], mime: RegExp): MulterOptions {
  return {
    storage: diskStorage({
      destination: dir,
      filename: (_req, file, cb) => cb(null, `${randomUUID()}${extname(file.originalname || '').toLowerCase()}`),
    }),
    limits: { fileSize: MAX_UPLOAD_SIZE, files: 1 },
    fileFilter: (_req, file, cb) => {
      const ext = extname(file.originalname || '').toLowerCase().slice(1)

      if (!extensions.includes(ext) || !mime.test(file.mimetype)) {
        cb(new BadRequestException(localized('validation.image.type', { allowed: extensions.map((e) => `.${e}`).join(', ') })), false)
        return
      }

      cb(null, true)
    },
  }
}

const imageUploadOptions = uploadOptions(IMAGES_DIR, IMAGE_EXTENSIONS, IMAGE_MIME)
const documentUploadOptions = uploadOptions(DOCUMENTS_DIR, DOCUMENT_EXTENSIONS, DOCUMENT_MIME)

/**
 * Generic file intake. Each route answers `{ url, name, size, type }` where
 * `url` is site-relative (`/uploads/<kind>/<uuid>.<ext>`) — files are served
 * statically from `/uploads/…` (see main.ts), outside the `/api` prefix. The
 * caller stores the returned path on its own record; the owning service is
 * responsible for unlinking it when the record drops the reference.
 */
@Controller('uploads')
export class UploadsController {
  /** Rich-text images, news covers, staff photos. */
  @Post('images')
  @UseInterceptors(FileInterceptor('file', imageUploadOptions))
  uploadImage(@UploadedFile() file?: Express.Multer.File) {
    return this.describe(file, '/uploads/images')
  }

  /** Student documents (TOPIK certificates). */
  @Post('documents')
  @UseInterceptors(FileInterceptor('file', documentUploadOptions))
  uploadDocument(@UploadedFile() file?: Express.Multer.File) {
    return this.describe(file, '/uploads/documents')
  }

  private describe(file: Express.Multer.File | undefined, prefix: string) {
    if (!file) {
      throw new BadRequestException('validation.image.required')
    }

    // Multer decodes the original name as latin1; restore UTF-8 (Korean/Cyrillic names).
    const name = Buffer.from(file.originalname, 'latin1').toString('utf8')

    return { url: `${prefix}/${file.filename}`, name, size: file.size, type: file.mimetype }
  }
}
