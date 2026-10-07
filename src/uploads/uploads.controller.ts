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
import { mediaStorage, type MediaKind } from '../storage/media-storage'

export const IMAGES_DIR = './uploads/images'
export const VIDEOS_DIR = './uploads/videos'
export const DOCUMENTS_DIR = './uploads/documents'
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
mkdirSync(VIDEOS_DIR, { recursive: true })
mkdirSync(DOCUMENTS_DIR, { recursive: true })

/**
 * Disk storage with a random file name and a double check on the type:
 * extension *and* declared mime type must both match — either alone is
 * trivial to spoof.
 */
function uploadOptions(
  dir: string,
  extensions: readonly string[],
  mime: RegExp,
  maxSize: number,
  typeMessage: 'validation.image.type' | 'validation.video.type',
): MulterOptions {
  return {
    storage: diskStorage({
      destination: dir,
      filename: (_req, file, cb) => cb(null, `${randomUUID()}${extname(file.originalname || '').toLowerCase()}`),
    }),
    limits: { fileSize: maxSize, files: 1 },
    fileFilter: (_req, file, cb) => {
      const ext = extname(file.originalname || '').toLowerCase().slice(1)

      if (!extensions.includes(ext) || !mime.test(file.mimetype)) {
        cb(new BadRequestException(localized(typeMessage, { allowed: extensions.map((e) => `.${e}`).join(', ') })), false)
        return
      }

      cb(null, true)
    },
  }
}

const imageUploadOptions = uploadOptions(IMAGES_DIR, IMAGE_EXTENSIONS, IMAGE_MIME, MAX_UPLOAD_SIZE, 'validation.image.type')
const videoUploadOptions = uploadOptions(VIDEOS_DIR, VIDEO_EXTENSIONS, VIDEO_MIME, MAX_VIDEO_SIZE, 'validation.video.type')

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
  /** Rich-text images, news covers, staff photos — to R2 when it is configured. */
  @Post('images')
  @Authenticated('admin')
  @UseInterceptors(FileInterceptor('file', imageUploadOptions))
  uploadImage(@UploadedFile() file?: Express.Multer.File) {
    return this.storeMedia('images', file)
  }

  /** Videos (mp4, webm, mov) — to R2 when it is configured, streamed in parts. */
  @Post('videos')
  @Authenticated('admin')
  @UseInterceptors(FileInterceptor('file', videoUploadOptions))
  uploadVideo(@UploadedFile() file?: Express.Multer.File) {
    return this.storeMedia('videos', file)
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

  /**
   * Multer has the file on this server's disk; with R2 it moves there and
   * the local copy goes. The answer is the same either way —
   * `/uploads/<kind>/<file>` — which is what records store.
   */
  private async storeMedia(kind: MediaKind, file: Express.Multer.File | undefined) {
    const described = this.describe(file, `/uploads/${kind}`)
    await mediaStorage().store(kind, file!.path, file!.filename, file!.mimetype)
    return described
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
