import { BadRequestException } from '@nestjs/common'
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface'
import { randomUUID } from 'crypto'
import { diskStorage } from 'multer'
import { extname } from 'path'

import { localized } from '../common/i18n/i18n-exception.filter'

export const MATERIALS_STORAGE_DIR = './uploads/materials'
export const MAX_MATERIAL_FILE_SIZE = 10 * 1024 * 1024

/**
 * Accepted upload extensions. Mirrored in the frontend `accept` list —
 * keep the two in sync. `.hwp`/`.hwpx` are the Korean office formats the
 * institute actually produces; `.zip` for bundled lesson packs.
 */
export const ALLOWED_MATERIAL_EXTENSIONS = [
  'pdf',
  'doc',
  'docx',
  'ppt',
  'pptx',
  'xls',
  'xlsx',
  'hwp',
  'hwpx',
  'txt',
  'zip',
  'jpg',
  'jpeg',
  'png',
  'mp4',
  'webm',
] as const

export const materialUploadOptions: MulterOptions = {
  storage: diskStorage({
    destination: MATERIALS_STORAGE_DIR,
    // Never trust the client's file name on disk: random id + safe extension.
    filename: (_req, file, cb) => {
      cb(null, `${randomUUID()}${extname(file.originalname || 'file').toLowerCase()}`)
    },
  }),
  limits: { fileSize: MAX_MATERIAL_FILE_SIZE, files: 1 },
  // A plain Error here surfaced as a 500 "Internal server error"; an
  // HttpException is what Nest turns into a proper 400 with the message.
  fileFilter: (_req, file, cb) => {
    const ext = extname(file.originalname || '').toLowerCase().slice(1)

    if (!(ALLOWED_MATERIAL_EXTENSIONS as readonly string[]).includes(ext)) {
      cb(
        new BadRequestException(
          localized('validation.material.fileType', {
            ext: ext || '?',
            allowed: ALLOWED_MATERIAL_EXTENSIONS.map((e) => `.${e}`).join(', '),
          }),
        ),
        false,
      )
      return
    }

    cb(null, true)
  },
}
