import { BadRequestException } from '@nestjs/common'
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface'
import { extname } from 'path'

import { localized } from '../common/i18n/i18n-exception.filter'
import { R2MulterStorage } from '../storage/r2-multer-storage'

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

/**
 * The type a material is stored and downloaded as, from its extension —
 * never what the browser claimed.
 */
export function materialType(fileName: string) {
  const types: Record<string, string> = {
    pdf: 'application/pdf',
    txt: 'text/plain; charset=utf-8',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    mp4: 'video/mp4',
    webm: 'video/webm',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    hwp: 'application/x-hwp',
    hwpx: 'application/hwp+zip',
    zip: 'application/zip',
  }
  return types[extname(fileName || '').toLowerCase().slice(1)] ?? 'application/octet-stream'
}

/**
 * The file a material's storageKey names. Keys are `materials/<uuid>.<ext>`;
 * rows from before R2 held a path on this server's disk
 * (`uploads\\materials\\<uuid>.<ext>`), which ends in the same name.
 */
export function materialFile(storageKey: string | null | undefined) {
  return storageKey ? (storageKey.split(/[\\/]/).pop() ?? null) : null
}

export const materialUploadOptions: MulterOptions = {
  // Straight to the private bucket — not to this server's disk.
  storage: new R2MulterStorage('materials', materialType),
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
