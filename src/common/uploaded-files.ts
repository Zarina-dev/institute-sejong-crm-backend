import { Logger } from '@nestjs/common'
import { unlink } from 'fs/promises'
import { basename, join } from 'path'

const logger = new Logger('uploads')

/**
 * Removes a file previously returned by `/uploads/*` given its site-relative
 * URL (`/uploads/images/<name>`). Best-effort by design: the owning row has
 * already changed, so a missing file is fine and any other failure is only
 * logged. Only the basename is used — the URL can never escape `uploads/`.
 */
export async function removeUploadedFile(url: string | null | undefined) {
  const match = url ? /^\/uploads\/(images|documents)\/[^/]+$/.exec(url) : null

  if (!match) {
    return
  }

  const file = join('uploads', match[1], basename(url as string))

  await unlink(file).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== 'ENOENT') {
      logger.warn(`Could not remove ${file}: ${error.message}`)
    }
  })
}
