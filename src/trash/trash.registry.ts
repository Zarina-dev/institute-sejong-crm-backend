import { unlink } from 'fs/promises'
import type { ObjectLiteral } from 'typeorm'

import { ChronologyEntry } from '../chronology/entities/chronology-entry.entity'
import { removeUploadedFile } from '../common/uploaded-files'
import { Competition } from '../competitions/entities/competition.entity'
import { Course } from '../courses/entities/course.entity'
import { ScheduleEvent } from '../events/entities/schedule-event.entity'
import { LearningMaterial } from '../materials/entities/learning-material.entity'
import { Meeting } from '../meetings/entities/meeting.entity'
import { NewsPost } from '../news/entities/news-post.entity'
import { StaffMember } from '../staff/entities/staff-member.entity'
import { StudyAbroad } from '../studies/entities/study-abroad.entity'
import { AcademicTerm } from '../terms/entities/term.entity'
import { Textbook } from '../textbooks/entities/textbook.entity'

/**
 * Everything the admin can delete, and what the trash needs to know about
 * each: how a deleted record is named in the list (`label`, plus a `detail`
 * such as its year), and which uploaded files belong to it — those are only
 * erased when the record is purged for good, so a restore brings them back.
 */
export type TrashKind<T extends ObjectLiteral = ObjectLiteral> = {
  type: string
  entity: new () => T
  label: (row: T) => string
  detail?: (row: T) => string | null
  /** Files to erase when the record is removed for good. */
  cleanup?: (row: T) => Promise<unknown>
}

const kind = <T extends ObjectLiteral>(definition: TrashKind<T>) => definition as unknown as TrashKind

const removeAll = (urls: Array<string | null | undefined>) => Promise.all(urls.map((url) => removeUploadedFile(url ?? null)))

export const TRASH_KINDS: TrashKind[] = [
  kind<Course>({ type: 'courses', entity: Course, label: (row) => row.subject || row.title, detail: (row) => row.title }),
  kind<NewsPost>({ type: 'news', entity: NewsPost, label: (row) => row.title, detail: (row) => row.category }),
  kind<ScheduleEvent>({ type: 'events', entity: ScheduleEvent, label: (row) => row.title, detail: (row) => row.startDate }),
  kind<Competition>({
    type: 'competitions',
    entity: Competition,
    label: (row) => row.title,
    detail: (row) => String(row.year),
    cleanup: (row) => removeAll([row.coverImage, ...(row.images ?? [])]),
  }),
  kind<StudyAbroad>({
    type: 'studies',
    entity: StudyAbroad,
    label: (row) => row.name || row.nameKy,
    detail: (row) => String(row.year),
    cleanup: (row) => removeAll([row.photo]),
  }),
  kind<StaffMember>({
    type: 'staff',
    entity: StaffMember,
    label: (row) => row.name,
    detail: (row) => row.position,
    cleanup: (row) => removeAll([row.photoUrl]),
  }),
  kind<Textbook>({ type: 'textbooks', entity: Textbook, label: (row) => row.title, cleanup: (row) => removeAll([row.coverImage]) }),
  kind<LearningMaterial>({
    type: 'materials',
    entity: LearningMaterial,
    label: (row) => row.title,
    detail: (row) => row.originalFileName,
    // Materials live on disk under uploads/materials, not as site URLs.
    cleanup: (row) => (row.storageKey ? unlink(row.storageKey).catch(() => undefined) : Promise.resolve()),
  }),
  kind<Meeting>({
    type: 'meetings',
    entity: Meeting,
    label: (row) => row.heldOn,
    cleanup: (row) => removeAll((row.attachments ?? []).map((file) => file.url)),
  }),
  kind<ChronologyEntry>({ type: 'chronology', entity: ChronologyEntry, label: (row) => row.title, detail: (row) => String(row.year) }),
  kind<AcademicTerm>({ type: 'terms', entity: AcademicTerm, label: (row) => row.code, detail: (row) => `${row.startDate} ~ ${row.endDate}` }),
]
