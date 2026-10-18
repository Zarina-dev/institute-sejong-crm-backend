import { NotFoundException } from '@nestjs/common'

import type { AuthUser } from './auth.service'

/** Drafts and hidden rows are the admin's alone: `?all=true` from anyone else is ignored. */
export const isAdmin = (user: AuthUser | null) => user?.role === 'admin'

/**
 * One record by id. An unpublished one exists only for the admin; anyone
 * else is told it does not, exactly as for an id that was never used.
 */
export function visibleTo<T extends { isPublished: boolean }>(user: AuthUser | null, record: T, notFoundKey: string): T {
  if (!record.isPublished && !isAdmin(user)) {
    throw new NotFoundException(notFoundKey)
  }
  return record
}
