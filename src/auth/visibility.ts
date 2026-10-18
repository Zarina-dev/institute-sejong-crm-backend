import { NotFoundException } from '@nestjs/common'

import type { AuthUser } from './auth.service'

/** Drafts and hidden rows are for the people who edit the site (any active account): `?all=true` from anyone else is ignored. */
export const isStaff = (user: AuthUser | null) => user !== null

/**
 * One record by id. An unpublished one exists only for the people who edit the site; anyone
 * else is told it does not, exactly as for an id that was never used.
 */
export function visibleTo<T extends { isPublished: boolean }>(user: AuthUser | null, record: T, notFoundKey: string): T {
  if (!record.isPublished && !isStaff(user)) {
    throw new NotFoundException(notFoundKey)
  }
  return record
}
