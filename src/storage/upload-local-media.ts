/**
 * One-off: copies the images and videos already on this server into the R2
 * bucket, and lets browsers read the bucket (CORS). Run after setting the R2
 * variables in .env and building:
 *
 *   npm run build && npm run media:to-r2
 *
 * Safe to run again: a file R2 already has is skipped. Local copies are
 * kept (the API keeps serving them until you delete uploads/images and
 * uploads/videos yourself); records are not touched, since they store
 * /uploads/<kind>/<file> either way.
 */
import { config } from 'dotenv'
import { readdirSync, statSync } from 'fs'
import { extname, join } from 'path'

import { MEDIA_KINDS, MediaStorage } from './media-storage'

config({ path: ['.env', '.env.local'], quiet: true })

const TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.mp4': 'video/mp4',
  '.m4v': 'video/x-m4v',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
}

async function main() {
  const storage = new MediaStorage()

  if (!storage.remote) {
    console.error('R2 is not configured: set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET and R2_PUBLIC_URL in backend/.env first.')
    process.exit(1)
  }

  try {
    await storage.allowBrowserReads()
    console.log('CORS: browsers may read the bucket (GET, HEAD from any origin).')
  } catch (error) {
    // An Object-only token cannot change bucket settings; the rule can be set in the dashboard instead.
    console.warn(`CORS not set (${(error as Error).message}). Add it in Cloudflare → R2 → ${storage.bucket()} → Settings → CORS policy; see README.`)
  }

  let copied = 0
  let skipped = 0
  let failed = 0

  for (const kind of MEDIA_KINDS) {
    const dir = join('uploads', kind)
    const files = (() => {
      try {
        return readdirSync(dir).filter((file) => statSync(join(dir, file)).isFile())
      } catch {
        return []
      }
    })()

    for (const file of files) {
      const type = TYPES[extname(file).toLowerCase()]
      if (!type) continue

      if (await storage.exists(kind, file)) {
        skipped += 1
        continue
      }

      try {
        await storage.store(kind, join(dir, file), file, type, { keepLocal: true })
        copied += 1
        console.log(`  ${kind}/${file}`)
      } catch (error) {
        failed += 1
        console.error(`  ${kind}/${file} failed: ${(error as Error).message}`)
      }
    }
  }

  console.log(`Done: ${copied} copied, ${skipped} already in R2, ${failed} failed.`)
  process.exit(failed > 0 ? 1 : 0)
}

void main()
