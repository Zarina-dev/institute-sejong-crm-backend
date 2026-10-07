import { BadRequestException, Controller, Get, NotFoundException, Param, Post, Query, Res, UploadedFile, UseInterceptors } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface'
import type { Response } from 'express'
import { extname } from 'path'

import { Authenticated } from '../auth/auth.guard'
import { localized } from '../common/i18n/i18n-exception.filter'
import { R2MulterStorage } from '../storage/r2-multer-storage'
import { r2Storage } from '../storage/r2-storage.service'

export const MAX_UPLOAD_SIZE = 5 * 1024 * 1024
export const MAX_DOCUMENT_SIZE = 20 * 1024 * 1024
/** A few minutes of phone video; anything longer belongs on a video site. */
export const MAX_VIDEO_SIZE = 300 * 1024 * 1024

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif'] as const
const IMAGE_MIME = /^image\/(jpeg|png|webp|gif)$/

const VIDEO_EXTENSIONS = ['mp4', 'webm', 'mov', 'm4v'] as const
const VIDEO_MIME = /^video\/(mp4|webm|quicktime|x-m4v)$/

/**
 * Attachments for 회의록. `.hwp` and `.hwpx` are what the office actually
 * writes, and Windows reports them as anything from `application/x-hwp` to
 * `application/octet-stream`, so documents are checked by extension and size
 * alone. They live in the private bucket and are only ever handed to the
 * admin (see readDocument).
 */
const DOCUMENT_EXTENSIONS = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'hwp', 'hwpx', 'txt', 'csv', 'zip', 'jpg', 'jpeg', 'png'] as const

/**
 * The type a document is stored and served as — decided by its extension,
 * never by what the browser claimed, so no upload can be turned into a page.
 * What a browser can show inline (PDF, images, text) gets its real type.
 */
export function documentType(extension: string) {
  const types: Record<string, string> = {
    pdf: 'application/pdf',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    txt: 'text/plain; charset=utf-8',
    csv: 'text/csv; charset=utf-8',
  }
  return types[extension] ?? 'application/octet-stream'
}

/** Exactly what an upload is named: a UUID and one of the extensions above. */
const STORED_DOCUMENT = /^[0-9a-f-]{36}\.([a-z0-9]+)$/

const extensionOf = (name: string) =>
  extname(name || '')
    .toLowerCase()
    .slice(1)

/**
 * Straight to R2 (R2MulterStorage), never to this server's disk. Extension
 * *and* declared MIME type are checked before a byte is stored — either
 * alone is trivial to spoof.
 */
function mediaUploadOptions(
  kind: 'images' | 'videos',
  extensions: readonly string[],
  mime: RegExp,
  maxSize: number,
  typeMessage: 'validation.image.type' | 'validation.video.type',
): MulterOptions {
  return {
    storage: new R2MulterStorage(kind),
    limits: { fileSize: maxSize, files: 1 },
    fileFilter: (_req, file, cb) => {
      if (!extensions.includes(extensionOf(file.originalname)) || !mime.test(file.mimetype)) {
        cb(new BadRequestException(localized(typeMessage, { allowed: extensions.map((e) => `.${e}`).join(', ') })), false)
        return
      }
      cb(null, true)
    },
  }
}

const imageUploadOptions = mediaUploadOptions('images', IMAGE_EXTENSIONS, IMAGE_MIME, MAX_UPLOAD_SIZE, 'validation.image.type')
const videoUploadOptions = mediaUploadOptions('videos', VIDEO_EXTENSIONS, VIDEO_MIME, MAX_VIDEO_SIZE, 'validation.video.type')

const documentUploadOptions: MulterOptions = {
  storage: new R2MulterStorage('documents', (name) => documentType(extensionOf(name))),
  limits: { fileSize: MAX_DOCUMENT_SIZE, files: 1 },
  fileFilter: (_req, file, cb) => {
    const ext = extensionOf(file.originalname)
    if (!DOCUMENT_EXTENSIONS.includes(ext as (typeof DOCUMENT_EXTENSIONS)[number])) {
      const allowed = DOCUMENT_EXTENSIONS.map((extension) => `.${extension}`).join(', ')
      cb(new BadRequestException(localized('validation.material.fileType', { ext, allowed })), false)
      return
    }
    cb(null, true)
  },
}

/**
 * File intake. Every route answers `{ url, name, size, type }`: `url` is the
 * site-relative `/uploads/<kind>/<uuid>.<ext>` the caller stores on its
 * record (its R2 key is the same without `/uploads/`); `name` is the
 * admin's own file name, kept for display and download.
 */
@Controller('uploads')
export class UploadsController {
  /** Rich-text images, news covers, staff photos — the public bucket. */
  @Post('images')
  @Authenticated('admin')
  @UseInterceptors(FileInterceptor('file', imageUploadOptions))
  uploadImage(@UploadedFile() file?: Express.Multer.File) {
    return this.describe(file, '/uploads/images')
  }

  /** Videos (mp4, webm, mov) — the public bucket, streamed in parts. */
  @Post('videos')
  @Authenticated('admin')
  @UseInterceptors(FileInterceptor('file', videoUploadOptions))
  uploadVideo(@UploadedFile() file?: Express.Multer.File) {
    return this.describe(file, '/uploads/videos')
  }

  /** 회의록 attachments — .hwp, .pdf and the Office formats; the private bucket. */
  @Post('documents')
  @Authenticated('admin')
  @UseInterceptors(FileInterceptor('file', documentUploadOptions))
  uploadDocument(@UploadedFile() file?: Express.Multer.File) {
    return this.describe(file, '/uploads/documents')
  }

  /**
   * 회의록 attachments are internal: only the admin reads them, through here.
   * Plain links and the preview pass the token as `?token=` (see auth.guard).
   * The answer is a redirect to a signed R2 link valid for five minutes —
   * the bucket itself is not public, so knowing a file's name is not enough.
   * With `?name=` the file downloads under its original name, otherwise it
   * opens inline, for the preview.
   */
  @Get('documents/:file')
  @Authenticated('admin')
  async readDocument(@Param('file') file: string, @Query('name') name: string | undefined, @Res() res: Response) {
    const extension = STORED_DOCUMENT.exec(file)?.[1]

    if (!extension || !DOCUMENT_EXTENSIONS.includes(extension as (typeof DOCUMENT_EXTENSIONS)[number])) {
      throw new NotFoundException('errors.upload.notFound')
    }

    const storage = r2Storage()
    if (!(await storage.head('documents', file))) {
      throw new NotFoundException('errors.upload.notFound')
    }

    const url = await storage.signedUrl('documents', file, { name: name || file, inline: !name, contentType: documentType(extension) })
    res.setHeader('Cache-Control', 'private, no-store')
    res.redirect(302, url)
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
