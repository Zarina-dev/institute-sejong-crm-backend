/**
 * Makes the thumbnail of every stored photo that has none yet — the photos
 * uploaded before thumbnails existed. Uploads make their own since.
 *
 *   npm run images:thumbs            — lists what is missing, makes nothing
 *   npm run images:thumbs -- --apply — makes them
 *
 * Safe to run again: a photo that already has its thumbnail is skipped.
 * Reads the originals over the public bucket's address; needs the R2_* settings.
 */
import { config } from 'dotenv'
import { Readable } from 'stream'

import { r2Storage } from '../storage/r2-storage.service'
import { THUMB_TYPE, thumbnailOf, thumbnailTransform } from '../storage/thumbnails'

config({ path: ['.env', '.env.local'], quiet: true })

async function main() {
  const apply = process.argv.includes('--apply')
  const storage = r2Storage()
  const existing = new Set((await storage.list('thumbs')).map((entry) => entry.file))
  const missing = (await storage.list('images'))
    .map((entry) => ({ file: entry.file, thumb: thumbnailOf(entry.file) }))
    .filter((entry): entry is { file: string; thumb: string } => entry.thumb !== null && !existing.has(entry.thumb))

  console.log(`${existing.size} thumbnail(s) already; ${missing.length} photo(s) without one.`)
  if (!apply) {
    for (const entry of missing) console.log(`  missing thumbs/${entry.thumb} (images/${entry.file})`)
    console.log('Run with --apply to make them.')
    return
  }

  let made = 0
  let failed = 0
  let before = 0
  let after = 0
  // A few at a time: R2 is fast, and sharp uses every core for one image anyway.
  const queue = [...missing]
  const worker = async () => {
    for (let entry = queue.shift(); entry; entry = queue.shift()) {
      try {
        const response = await fetch(storage.publicUrl('images', entry.file))
        if (!response.ok) throw new Error(`GET ${response.status}`)
        const original = Buffer.from(await response.arrayBuffer())
        const thumb = await Readable.from(original).pipe(thumbnailTransform()).toBuffer()
        await storage.upload('thumbs', entry.thumb, thumb, THUMB_TYPE).done
        made += 1
        before += original.length
        after += thumb.length
      } catch (error) {
        failed += 1
        console.warn(`  failed images/${entry.file}: ${(error as Error).message}`)
      }
    }
  }
  await Promise.all(Array.from({ length: 4 }, worker))

  const kb = (bytes: number) => Math.round(bytes / 1024)
  console.log(`Made ${made}, failed ${failed}. Those photos: ${kb(before)} kB as uploaded → ${kb(after)} kB as thumbnails.`)
}

void main()
