import { BadRequestException, Controller, Get, NotFoundException, Param, Post, Query, Res, UploadedFile, UseInterceptors } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface'
import { randomUUID } from 'crypto'
import { existsSync, mkdirSync } from 'fs'
import { diskStorage } from 'multer'
import type { Response } from 'express'
import { extname, resolve } from 'path'

import { Authenticated } from '../auth/auth.guard'
import { localized } from '../common/i18n/i18n-exception.filter'

export const IMAGES_DIR = './uploads/images'
export const DOCUMENTS_DIR = './uploads/documents'
export const MAX_UPLOAD_SIZE = 5 * 1024 * 1024
export const MAX_DOCUMENT_SIZE = 20 * 1024 * 1024

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif'] as const
const IMAGE_MIME = /^image\/(jpeg|png|webp|gif)$/

/**
 * Attachments for 회의록. `.hwp` and `.hwpx` are what the office actually
 * writes, and Windows reports them as anything from `application/x-hwp` to
 * `application/octet-stream`, so documents are checked by extension and size
 * alone. They are stored under a random name and only ever handed back to
 * the admin (see readDocument), with a fixed type per extension.
 */
const DOCUMENT_EXTENSIONS = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'hwp', 'hwpx', 'txt', 'csv', 'zip', 'jpg', 'jpeg', 'png'] as const

/**
 * The type each stored document is served as — decided by its extension,
 * never sniffed, so no upload can be turned into a page. What a browser can
 * show inline (PDF, images, text) gets its real type; the rest are bytes.
 */
const DOCUMENT_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  txt: 'text/plain; charset=utf-8',
  csv: 'text/csv; charset=utf-8',
}

/** Exactly what uploadDocument names a file: a UUID and one of the extensions above. */
const STORED_DOCUMENT = /^[0-9a-f-]{36}\.([a-z]+)$/

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

/** Same storage as images, extension-only check, and a larger cap. */
const documentUploadOptions: MulterOptions = {
  storage: diskStorage({
    destination: DOCUMENTS_DIR,
    filename: (_req, file, cb) => cb(null, `${randomUUID()}${extname(file.originalname || '').toLowerCase()}`),
  }),
  limits: { fileSize: MAX_DOCUMENT_SIZE, files: 1 },
  fileFilter: (_req, file, cb) => {
    const ext = extname(file.originalname || '')
      .toLowerCase()
      .slice(1)

    if (!DOCUMENT_EXTENSIONS.includes(ext as (typeof DOCUMENT_EXTENSIONS)[number])) {
      const allowed = DOCUMENT_EXTENSIONS.map((extension) => `.${extension}`).join(', ')
      cb(new BadRequestException(localized('validation.material.fileType', { ext, allowed })), false)
      return
    }

    cb(null, true)
  },
}

/**
 * Image intake. The route answers `{ url, name, size, type }` where
 * `url` is site-relative (`/uploads/<kind>/<uuid>.<ext>`) — files are served
 * statically from `/uploads/…` (see main.ts), outside the `/api` prefix. The
 * caller stores the returned path on its own record; the owning service is
 * responsible for unlinking it when the record drops the reference.
 */
@Controller('uploads')
export class UploadsController {
  /** Rich-text images, news covers, staff photos. */
  @Post('images')
  @Authenticated('admin')
  @UseInterceptors(FileInterceptor('file', imageUploadOptions))
  uploadImage(@UploadedFile() file?: Express.Multer.File) {
    return this.describe(file, '/uploads/images')
  }

  /** 회의록 attachments — .hwp, .pdf and the Office formats. */
  @Post('documents')
  @Authenticated('admin')
  @UseInterceptors(FileInterceptor('file', documentUploadOptions))
  uploadDocument(@UploadedFile() file?: Express.Multer.File) {
    return this.describe(file, '/uploads/documents')
  }

  /**
   * 회의록 attachments are internal, so unlike images they are not static
   * files: only the admin reads them, through here. Plain links and the
   * preview pass the token as `?token=` (see auth.guard). With `?name=`
   * the file comes as a download under its original name — a cross-origin
   * `<a download>` cannot rename it — otherwise inline, for the preview.
   */
  @Get('documents/:file')
  @Authenticated('admin')
  readDocument(@Param('file') file: string, @Query('name') name: string | undefined, @Res() res: Response) {
    const match = STORED_DOCUMENT.exec(file)
    const extension = match?.[1]

    if (!extension || !DOCUMENT_EXTENSIONS.includes(extension as (typeof DOCUMENT_EXTENSIONS)[number])) {
      throw new NotFoundException('errors.upload.notFound')
    }

    const path = resolve(DOCUMENTS_DIR, file)

    if (!existsSync(path)) {
      throw new NotFoundException('errors.upload.notFound')
    }

    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Cache-Control', 'private, max-age=3600')

    if (name) {
      res.download(path, name)
      return
    }

    res.type(DOCUMENT_TYPES[extension] ?? 'application/octet-stream')
    res.sendFile(path)
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
