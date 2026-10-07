import { ServiceUnavailableException } from '@nestjs/common'
import { randomUUID } from 'crypto'
import type { Request } from 'express'
import type { StorageEngine } from 'multer'
import { extname } from 'path'
import { Transform } from 'stream'

import { r2Storage, type StoredKind } from './r2-storage.service'

/**
 * Multer storage that writes nowhere but R2: the request's file stream goes
 * straight into a multipart upload — no file on this server's disk, and no
 * whole file in memory. The file gets a random name with its own extension
 * (`<uuid>.<ext>`); the name the admin's file had is kept by the caller.
 *
 * Over the size limit, multer stops the stream and this aborts the upload,
 * so a cut-off file never lands in the bucket.
 */
export class R2MulterStorage implements StorageEngine {
  /**
   * @param typeFor the Content-Type to store a file with, from its name — for
   * kinds whose browser-declared type is not to be trusted (documents,
   * materials). Images and videos keep the type already checked on upload.
   */
  constructor(
    private readonly kind: StoredKind,
    private readonly typeFor?: (originalName: string) => string,
  ) {}

  _handleFile(_req: Request, file: Express.Multer.File, callback: (error?: unknown, info?: Partial<Express.Multer.File>) => void) {
    const name = `${randomUUID()}${extname(file.originalname || '').toLowerCase()}`
    let size = 0
    const counter = new Transform({
      transform(chunk: Buffer, _encoding, next) {
        size += chunk.length
        next(null, chunk)
      },
    })

    const upload = r2Storage().upload(this.kind, name, file.stream.pipe(counter), this.typeFor?.(file.originalname) ?? (file.mimetype || 'application/octet-stream'))
    let tooLarge = false
    file.stream.on('limit', () => {
      tooLarge = true
      void upload.abort()
    })

    upload.done.then(
      () => (tooLarge ? callback(new Error('File too large')) : callback(null, { filename: name, size, path: `${this.kind}/${name}` })),
      // R2 unreachable or refusing: a 503 the admin can read, not a bare 500.
      () => callback(tooLarge ? new Error('File too large') : new ServiceUnavailableException('errors.storage.unavailable')),
    )
  }

  /** Called by multer when a request fails after the file was stored. */
  _removeFile(_req: Request, file: Express.Multer.File, callback: (error: Error | null) => void) {
    void r2Storage()
      .remove(this.kind, file.filename)
      .then(() => callback(null))
  }
}
