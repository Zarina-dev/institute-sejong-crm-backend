import { Logger, ServiceUnavailableException } from '@nestjs/common'
import { randomUUID } from 'crypto'
import type { Request } from 'express'
import type { StorageEngine } from 'multer'
import { extname } from 'path'
import { PassThrough, Transform } from 'stream'

import { r2Storage, type StoredKind } from './r2-storage.service'
import { THUMB_TYPE, thumbnailOf, thumbnailTransform } from './thumbnails'

/** Enough of a file's start to tell every accepted image format apart (WebP needs 12). */
export const SIGNATURE_BYTES = 12

/** JPEG, PNG, GIF or WebP, by their first bytes — whatever the name or declared type says. */
export function isImageSignature(head: Buffer) {
  const starts = (...bytes: number[]) => bytes.every((byte, i) => head[i] === byte)
  return (
    starts(0xff, 0xd8, 0xff) || // JPEG
    starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a) || // PNG
    head.subarray(0, 6).toString('latin1') === 'GIF87a' ||
    head.subarray(0, 6).toString('latin1') === 'GIF89a' ||
    (head.subarray(0, 4).toString('latin1') === 'RIFF' && head.subarray(8, 12).toString('latin1') === 'WEBP')
  )
}

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
    /** Photos: also store the smaller copy the site shows in lists (storage/thumbnails.ts). */
    private readonly thumbnails = false,
    /**
     * Checks the file's first bytes (its signature), so what is stored is
     * what the name and declared type say — an HTML page renamed `a.png`
     * is refused with `rejection` before it is kept.
     */
    private readonly signature?: { accepts: (head: Buffer) => boolean; rejection: () => Error },
  ) {}

  private readonly logger = new Logger('R2Upload')

  _handleFile(_req: Request, file: Express.Multer.File, callback: (error?: unknown, info?: Partial<Express.Multer.File>) => void) {
    const name = `${randomUUID()}${extname(file.originalname || '').toLowerCase()}`
    let size = 0
    const signature = this.signature
    let head: Buffer | null = signature ? Buffer.alloc(0) : null
    let rejected = false
    const reject = () => {
      rejected = true
      void upload.abort()
      void thumb?.abort()
    }
    const counter = new Transform({
      transform(chunk: Buffer, _encoding, next) {
        size += chunk.length
        if (head && signature) {
          head = Buffer.concat([head, chunk])
          if (head.length >= SIGNATURE_BYTES) {
            if (!signature.accepts(head)) reject()
            head = null
          }
        }
        next(null, chunk)
      },
      flush(done) {
        // Shorter than any signature: not an image at all.
        if (head && signature && !signature.accepts(head)) reject()
        done()
      },
    })
    const original = new PassThrough()
    file.stream.pipe(counter).pipe(original)

    const storage = r2Storage()
    const upload = storage.upload(this.kind, name, original, this.typeFor?.(file.originalname) ?? (file.mimetype || 'application/octet-stream'))

    // The thumbnail is made from the same bytes as they arrive — no second
    // read, no temporary file. It is a convenience: if it fails (a damaged
    // photo), the upload still succeeds and the site shows the original.
    const thumbName = this.thumbnails ? thumbnailOf(name) : null
    let thumb: ReturnType<typeof storage.upload> | null = null
    if (thumbName) {
      const resize = thumbnailTransform()
      resize.on('error', (error: Error) => this.logger.warn(`Thumbnail of ${name} not made: ${error.message}`))
      counter.pipe(resize)
      thumb = storage.upload('thumbs', thumbName, resize, THUMB_TYPE)
    }
    const thumbDone = thumb
      ? thumb.done.then(
          () => true,
          () => false,
        )
      : Promise.resolve(false)

    let tooLarge = false
    file.stream.on('limit', () => {
      tooLarge = true
      void upload.abort()
      void thumb?.abort()
    })

    Promise.all([upload.done, thumbDone]).then(
      ([, thumbStored]) => {
        if (rejected) {
          void storage.remove(this.kind, name)
          if (thumbStored && thumbName) void storage.remove('thumbs', thumbName)
          callback(this.signature!.rejection())
          return
        }
        if (tooLarge) {
          if (thumbStored && thumbName) void storage.remove('thumbs', thumbName)
          callback(new Error('File too large'))
          return
        }
        callback(null, { filename: name, size, path: `${this.kind}/${name}` })
      },
      // R2 unreachable or refusing: a 503 the admin can read, not a bare 500.
      () => {
        if (thumbName) void storage.remove('thumbs', thumbName)
        if (rejected) {
          callback(this.signature!.rejection())
          return
        }
        callback(tooLarge ? new Error('File too large') : new ServiceUnavailableException('errors.storage.unavailable'))
      },
    )
  }

  /** Called by multer when a request fails after the file was stored. */
  _removeFile(_req: Request, file: Express.Multer.File, callback: (error: Error | null) => void) {
    const thumbName = this.thumbnails ? thumbnailOf(file.filename) : null
    void Promise.all([r2Storage().remove(this.kind, file.filename), thumbName ? r2Storage().remove('thumbs', thumbName) : null]).then(() =>
      callback(null),
    )
  }
}
