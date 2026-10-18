import sharp from 'sharp'

/**
 * A smaller copy of every uploaded photo, for where the site shows it small:
 * cards, carousels, avatars, covers in a list. The original stays as it was
 * uploaded and is what opens full size. Measured on the photos in R2: ~80%
 * fewer bytes (1238 px JPEG ≈ 200 kB → 800 px WebP ≈ 45 kB).
 *
 * Records never mention a thumbnail. Its name follows from the original's —
 * `images/<uuid>.jpg` → `thumbs/<uuid>.webp` — so nothing in the database
 * changes, the site derives the address, and a photo without one (a GIF, or
 * one uploaded before thumbnails) is shown from its original instead.
 */
export const THUMB_WIDTH = 800
export const THUMB_TYPE = 'image/webp'

/** Photos that get a thumbnail. GIFs keep only their original (it may be animated). */
const THUMBNAILED = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.(jpe?g|png|webp)$/i

/** `<uuid>.jpg` → `<uuid>.webp` (under `thumbs/`); null for files that have none. */
export function thumbnailOf(imageFile: string) {
  const match = THUMBNAILED.exec(imageFile)
  return match ? `${match[1].toLowerCase()}.webp` : null
}

/** The original's id a thumbnail belongs to: `<uuid>.webp` → `<uuid>`. */
export function thumbnailOwner(thumbFile: string) {
  return /^([0-9a-f-]{36})\.webp$/i.exec(thumbFile)?.[1].toLowerCase() ?? null
}

/**
 * A stream that turns the photo piped into it into its thumbnail: turned
 * upright by its EXIF orientation, at most THUMB_WIDTH wide (never enlarged),
 * WebP at a quality where the difference does not show at that size.
 */
export function thumbnailTransform() {
  return sharp({ failOn: 'none' }).rotate().resize({ width: THUMB_WIDTH, withoutEnlargement: true }).webp({ quality: 78, effort: 4 })
}
