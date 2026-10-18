import { parseStoredUrl, r2Storage } from '../storage/r2-storage.service'
import { thumbnailOf } from '../storage/thumbnails'

/**
 * Removes a file previously returned by `/uploads/*`, given the
 * site-relative URL a record stored (`/uploads/images/<name>`), from R2.
 * Best-effort by design: the owning row has already changed, so a failure is
 * only logged — and the sweep (MediaSweepService) retries what is left over.
 */
export async function removeUploadedFile(url: string | null | undefined) {
  const stored = parseStoredUrl(url)
  if (stored) {
    // A photo goes together with its thumbnail.
    const thumb = stored.kind === 'images' ? thumbnailOf(stored.file) : null
    await Promise.all([r2Storage().remove(stored.kind, stored.file), thumb ? r2Storage().remove('thumbs', thumb) : null])
  }
}
