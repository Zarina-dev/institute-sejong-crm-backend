import { DeleteObjectCommand, HeadObjectCommand, PutBucketCorsCommand, S3Client } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import { Logger } from '@nestjs/common'
import { createReadStream } from 'fs'
import { unlink } from 'fs/promises'

/** The two kinds of public media; each is a folder locally and a key prefix in R2. */
export type MediaKind = 'images' | 'videos'
export const MEDIA_KINDS: readonly MediaKind[] = ['images', 'videos']

/** `/uploads/images/<file>` → its kind and file, or null for anything else (documents stay local). */
export function parseMediaUrl(url: string | null | undefined): { kind: MediaKind; file: string } | null {
  const match = url ? /^\/uploads\/(images|videos)\/([\w.-]+)$/.exec(url) : null
  return match ? { kind: match[1] as MediaKind, file: match[2] } : null
}

type R2Config = { endpoint: string; bucket: string; accessKeyId: string; secretAccessKey: string; publicUrl: string }

const R2_VARIABLES = ['R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET', 'R2_PUBLIC_URL'] as const

/**
 * R2 settings from the environment, or null when none are set (media then
 * stays on this server's disk, as in development). A half-filled set is an
 * error rather than a silent fallback: uploads would land on a disk the
 * production site does not serve them from.
 */
function readR2Config(): R2Config | null {
  const env = process.env
  const given = [...R2_VARIABLES, 'R2_ACCOUNT_ID', 'R2_ENDPOINT'].filter((name) => env[name]?.trim())

  if (given.length === 0) {
    return null
  }

  const missing = R2_VARIABLES.filter((name) => !env[name]?.trim())
  const endpoint = env.R2_ENDPOINT?.trim() || (env.R2_ACCOUNT_ID?.trim() ? `https://${env.R2_ACCOUNT_ID.trim()}.r2.cloudflarestorage.com` : '')

  if (missing.length > 0 || !endpoint) {
    throw new Error(`Cloudflare R2 is half configured — set ${[...missing, ...(endpoint ? [] : ['R2_ACCOUNT_ID'])].join(', ')} (see .env.example).`)
  }

  return {
    endpoint,
    bucket: env.R2_BUCKET!.trim(),
    accessKeyId: env.R2_ACCESS_KEY_ID!.trim(),
    secretAccessKey: env.R2_SECRET_ACCESS_KEY!.trim(),
    publicUrl: env.R2_PUBLIC_URL!.trim().replace(/\/+$/, ''),
  }
}

/**
 * Where the site's images and videos live: a Cloudflare R2 bucket when one
 * is configured, otherwise `uploads/<kind>/` on this server. Either way a
 * file is known by the same site-relative path, `/uploads/<kind>/<file>`,
 * which is what the database stores — switching storage moves files, never
 * rows. In R2 the key is `<kind>/<file>` and the public address
 * `${R2_PUBLIC_URL}/<kind>/<file>`.
 */
export class MediaStorage {
  private readonly logger = new Logger('MediaStorage')
  private readonly config: R2Config | null
  private readonly client: S3Client | null

  constructor() {
    this.config = readR2Config()
    this.client = this.config
      ? new S3Client({
          region: 'auto',
          endpoint: this.config.endpoint,
          // R2 and S3-compatible test servers address the bucket by path.
          forcePathStyle: true,
          credentials: { accessKeyId: this.config.accessKeyId, secretAccessKey: this.config.secretAccessKey },
        })
      : null

    this.logger.log(this.config ? `Images and videos go to R2 bucket "${this.config.bucket}" (${this.config.publicUrl}).` : 'Images and videos stay on this server (R2 not configured).')
  }

  /** Whether media is kept in R2. */
  get remote() {
    return this.client !== null
  }

  bucket() {
    return this.config?.bucket ?? null
  }

  /** The public address of a stored file, or null when it is served from this server. */
  publicUrl(kind: MediaKind, file: string) {
    return this.config ? `${this.config.publicUrl}/${kind}/${file}` : null
  }

  /**
   * Takes a file multer has just written to `uploads/<kind>/` and, with R2,
   * moves it there — streamed in parts, so a video is never held in memory
   * — removing the local copy once it is stored. Without R2 it stays put.
   */
  async store(kind: MediaKind, localPath: string, file: string, contentType: string, options: { keepLocal?: boolean } = {}) {
    if (!this.client || !this.config) {
      return
    }

    await new Upload({
      client: this.client,
      params: {
        Bucket: this.config.bucket,
        Key: `${kind}/${file}`,
        Body: createReadStream(localPath),
        ContentType: contentType,
        // Names are random and never reused, so a copy can be kept for a year.
        CacheControl: 'public, max-age=31536000, immutable',
      },
      partSize: 8 * 1024 * 1024,
      queueSize: 4,
    }).done()

    if (!options.keepLocal) {
      await unlink(localPath).catch(() => undefined)
    }
  }

  /** Whether R2 already has a file — the migration skips those. */
  async exists(kind: MediaKind, file: string) {
    if (!this.client || !this.config) return false
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.config.bucket, Key: `${kind}/${file}` }))
      return true
    } catch {
      return false
    }
  }

  /** Removes a file from R2 (the caller removes any local copy). Best-effort, like every file cleanup here. */
  async remove(kind: MediaKind, file: string) {
    if (!this.client || !this.config) return
    try {
      await this.client.send(new DeleteObjectCommand({ Bucket: this.config.bucket, Key: `${kind}/${file}` }))
    } catch (error) {
      this.logger.warn(`Could not remove ${kind}/${file} from R2: ${(error as Error).message}`)
    }
  }

  /**
   * Lets pages read the media with fetch (the 회의록 PDF and Word export draw
   * images; a video player may seek). The bucket is public for reading
   * anyway, so any origin may GET and HEAD.
   */
  async allowBrowserReads() {
    if (!this.client || !this.config) return
    await this.client.send(
      new PutBucketCorsCommand({
        Bucket: this.config.bucket,
        CORSConfiguration: {
          CORSRules: [{ AllowedMethods: ['GET', 'HEAD'], AllowedOrigins: ['*'], AllowedHeaders: ['*'], ExposeHeaders: ['Content-Length', 'Content-Range', 'ETag'], MaxAgeSeconds: 86400 }],
        },
      }),
    )
  }
}

let instance: MediaStorage | null = null

/**
 * The one storage, created on first use — after ConfigModule has read .env,
 * which happens when the app module loads, not when this file is imported.
 */
export function mediaStorage() {
  instance ??= new MediaStorage()
  return instance
}
