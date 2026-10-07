import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutBucketCorsCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { Logger } from '@nestjs/common'
import type { Readable } from 'stream'

/**
 * What the site stores, each a folder (key prefix) in R2:
 * - images, videos — public: anyone may see them, so they live in the
 *   public bucket and are linked straight from R2_PUBLIC_URL;
 * - documents (회의록 attachments), materials (학습자료실) — private: their
 *   bucket has no public access, and the API hands out a short-lived signed
 *   link only after checking who asks. R2's public access is bucket-wide,
 *   which is why the two kinds of files cannot share a bucket.
 */
export const STORED_KINDS = ['images', 'videos', 'documents', 'materials'] as const
export type StoredKind = (typeof STORED_KINDS)[number]
export type MediaKind = 'images' | 'videos'
export const MEDIA_KINDS: readonly MediaKind[] = ['images', 'videos']
const PUBLIC_KINDS: readonly StoredKind[] = MEDIA_KINDS

/** `/uploads/<kind>/<file>` — what records store for images, videos and documents. */
export function parseStoredUrl(url: string | null | undefined): { kind: StoredKind; file: string } | null {
  const match = url ? /^\/uploads\/(images|videos|documents|materials)\/([\w.-]+)$/.exec(url) : null
  return match ? { kind: match[1] as StoredKind, file: match[2] } : null
}

/** Only the public kinds — the ones a URL may be redirected to. */
export function parseMediaUrl(url: string | null | undefined): { kind: MediaKind; file: string } | null {
  const parsed = parseStoredUrl(url)
  return parsed && PUBLIC_KINDS.includes(parsed.kind) ? (parsed as { kind: MediaKind; file: string }) : null
}

type R2Config = {
  endpoint: string
  publicBucket: string
  privateBucket: string
  accessKeyId: string
  secretAccessKey: string
  publicUrl: string
}

const REQUIRED = ['R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET', 'R2_PRIVATE_BUCKET', 'R2_PUBLIC_URL'] as const

/** Just the scheme and host: the dashboard shows the S3 address with /<bucket> on the end. */
function endpointOrigin(value: string | undefined) {
  if (!value) return ''
  try {
    return new URL(value).origin
  } catch {
    throw new Error(`R2_ENDPOINT is not a URL: ${value}`)
  }
}

/**
 * R2 settings, from the environment only — credentials are never written in
 * code. Every file lives in R2, so a missing value stops the API at start
 * rather than letting an upload fail later.
 */
function readConfig(): R2Config {
  const env = process.env
  const missing: string[] = REQUIRED.filter((name) => !env[name]?.trim())
  const endpoint =
    endpointOrigin(env.R2_ENDPOINT?.trim()) || (env.R2_ACCOUNT_ID?.trim() ? `https://${env.R2_ACCOUNT_ID.trim()}.r2.cloudflarestorage.com` : '')
  if (!endpoint) missing.push('R2_ACCOUNT_ID')

  if (missing.length > 0) {
    throw new Error(`Cloudflare R2 is not configured — set ${missing.join(', ')} in backend/.env (see .env.example).`)
  }

  return {
    endpoint,
    publicBucket: env.R2_BUCKET!.trim(),
    privateBucket: env.R2_PRIVATE_BUCKET!.trim(),
    accessKeyId: env.R2_ACCESS_KEY_ID!.trim(),
    secretAccessKey: env.R2_SECRET_ACCESS_KEY!.trim(),
    publicUrl: env.R2_PUBLIC_URL!.trim().replace(/\/+$/, ''),
  }
}

/** `filename*` carries Korean / Russian names; the plain one is an ASCII stand-in for old clients. */
export function contentDisposition(type: 'inline' | 'attachment', name: string) {
  const ascii = name.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_')
  return `${type}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`
}

/**
 * The one place that talks to Cloudflare R2 (S3 API). Services, the upload
 * controller and the sweep go through it; none of them knows about the SDK.
 * An object's key is `<kind>/<file>` — the stored `/uploads/<kind>/<file>`
 * path without its prefix — so records never needed rewriting.
 */
export class R2StorageService {
  private readonly logger = new Logger('R2Storage')
  private readonly config: R2Config
  private readonly client: S3Client

  constructor() {
    this.config = readConfig()
    this.client = new S3Client({
      region: 'auto',
      endpoint: this.config.endpoint,
      forcePathStyle: true,
      credentials: { accessKeyId: this.config.accessKeyId, secretAccessKey: this.config.secretAccessKey },
    })
    this.logger.log(`Public files → "${this.config.publicBucket}" (${this.config.publicUrl}); private files → "${this.config.privateBucket}".`)
  }

  bucketFor(kind: StoredKind) {
    return PUBLIC_KINDS.includes(kind) ? this.config.publicBucket : this.config.privateBucket
  }

  buckets() {
    return [this.config.publicBucket, this.config.privateBucket]
  }

  /** Where anyone can read an image or a video. Private kinds have no such address. */
  publicUrl(kind: MediaKind, file: string) {
    return `${this.config.publicUrl}/${kind}/${file}`
  }

  /**
   * Streams a file into R2 in 8 MB parts (four at a time): memory stays
   * bounded whatever the size, so a 300 MB video never sits in RAM. Abort
   * with the returned handle (e.g. when the upload goes over its limit).
   */
  upload(kind: StoredKind, file: string, body: Readable | Buffer, contentType: string) {
    const key = `${kind}/${file}`
    const upload = new Upload({
      client: this.client,
      params: {
        Bucket: this.bucketFor(kind),
        Key: key,
        Body: body,
        ContentType: contentType,
        // Names are random and never reused, so a copy may be kept for a year.
        CacheControl: PUBLIC_KINDS.includes(kind) ? 'public, max-age=31536000, immutable' : 'private, max-age=0',
      },
      partSize: 8 * 1024 * 1024,
      queueSize: 4,
    })

    const started = Date.now()
    this.logger.log(`R2 upload started: ${key}`)
    const done = upload.done().then(
      (result) => {
        this.logger.log(`R2 upload completed: ${key} (${Date.now() - started} ms)`)
        return result
      },
      (error: Error) => {
        this.logger.warn(`R2 upload failed: ${key} — ${error.name}: ${error.message}`)
        throw error
      },
    )

    return { done, abort: () => upload.abort() }
  }

  /** Size and ETag of a stored object, or null when there is none. */
  async head(kind: StoredKind, file: string) {
    try {
      const result = await this.client.send(new HeadObjectCommand({ Bucket: this.bucketFor(kind), Key: `${kind}/${file}` }))
      return { size: result.ContentLength ?? 0, etag: (result.ETag ?? '').replace(/"/g, ''), contentType: result.ContentType ?? '' }
    } catch (error) {
      const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode
      if (status === 404) return null
      throw error
    }
  }

  /**
   * A link to a private file, valid for a few minutes, that downloads (or
   * opens) it under its original name. Handed out by the API only after it
   * has checked who asks.
   */
  signedUrl(kind: StoredKind, file: string, options: { name?: string; inline?: boolean; contentType?: string; expiresIn?: number } = {}) {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.bucketFor(kind),
        Key: `${kind}/${file}`,
        ResponseContentDisposition: options.name ? contentDisposition(options.inline ? 'inline' : 'attachment', options.name) : undefined,
        ResponseContentType: options.contentType,
        ResponseCacheControl: 'private, no-store',
      }),
      { expiresIn: options.expiresIn ?? 300 },
    )
  }

  /** Removes an object. Best-effort: a failure is logged and the sweep retries later. */
  async remove(kind: StoredKind, file: string) {
    const key = `${kind}/${file}`
    try {
      await this.client.send(new DeleteObjectCommand({ Bucket: this.bucketFor(kind), Key: key }))
      this.logger.log(`R2 delete completed: ${key}`)
    } catch (error) {
      this.logger.warn(`R2 delete failed: ${key} — ${(error as Error).message}`)
    }
  }

  /** Every object under a kind, with when it was stored — for the sweep. */
  async list(kind: StoredKind) {
    const files: Array<{ file: string; modified: Date }> = []
    let token: string | undefined
    do {
      const page = await this.client.send(new ListObjectsV2Command({ Bucket: this.bucketFor(kind), Prefix: `${kind}/`, ContinuationToken: token }))
      for (const object of page.Contents ?? []) {
        const file = object.Key?.slice(kind.length + 1)
        if (file && !file.includes('/')) files.push({ file, modified: object.LastModified ?? new Date() })
      }
      token = page.IsTruncated ? page.NextContinuationToken : undefined
    } while (token)
    return files
  }

  /**
   * Lets pages read with fetch(): the 회의록 preview and the PDF/Word export
   * fetch files. For the private bucket that only ever means a signed link
   * — the signature, not the origin, is what grants access.
   */
  async allowBrowserReads(bucket: string) {
    await this.client.send(
      new PutBucketCorsCommand({
        Bucket: bucket,
        CORSConfiguration: {
          CORSRules: [
            { AllowedMethods: ['GET', 'HEAD'], AllowedOrigins: ['*'], AllowedHeaders: ['*'], ExposeHeaders: ['Content-Length', 'Content-Range', 'Content-Disposition', 'ETag'], MaxAgeSeconds: 86400 },
          ],
        },
      }),
    )
  }
}

let instance: R2StorageService | null = null

/**
 * The one storage, created on first use — after ConfigModule has read .env.
 * Plain singleton rather than a Nest provider: the multer storage engine and
 * removeUploadedFile run outside dependency injection.
 */
export function r2Storage() {
  instance ??= new R2StorageService()
  return instance
}
