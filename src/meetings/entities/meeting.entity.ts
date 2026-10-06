import { Column, CreateDateColumn, DeleteDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

/** One file attached to the minutes, as `POST /uploads/documents` returns it. */
export type MeetingAttachment = {
  /** Site-relative `/uploads/documents/…` path. */
  url: string
  /** The name the file had on the admin's machine. */
  name: string
  size: number
  type: string
}

/**
 * The rows of 참석 현황 on the institute's form, in its order. A person is
 * placed by their position when picked from 교직원 (see the frontend's
 * roleFromPosition) and the admin can move them.
 */
export const ATTENDEE_ROLES = ['director', 'dispatched', 'local', 'operations', 'other'] as const
export type AttendeeRole = (typeof ATTENDEE_ROLES)[number]

/** One person at the meeting — staff, or a guest typed by name. */
export type MeetingAttendee = {
  /** The 교직원 record they were picked from; null for a guest. */
  staffId: string | null
  name: string
  role: AttendeeRole
  /** Their position as it read on the day — kept, since positions change. */
  position: string
}

/**
 * 회의록 — internal minutes. Unlike every other table in this project these
 * rows never reach the public site: the controller marks *all* of its routes
 * `@Authenticated('admin')`, reads included.
 */
@Entity('meeting_minutes')
@Index('idx_meeting_held_on', ['heldOn'])
export class Meeting {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  /** 회의명 — "주간업무회의" for most. */
  @Column({ type: 'varchar', length: 255 })
  title!: string

  /** 회의 방식 — "화상 회의 및 현장 토의" … */
  @Column({ type: 'varchar', length: 100, default: '' })
  method!: string

  /** 장소 */
  @Column({ type: 'varchar', length: 200, default: '' })
  place!: string

  /** 기안 — who wrote the minutes. */
  @Column({ type: 'varchar', length: 120, default: '' })
  drafter!: string

  /** 결재 — who signs them off. */
  @Column({ type: 'varchar', length: 120, default: '' })
  approver!: string

  /** 참석 현황, row by row. Older minutes have only the names in `attendees`. */
  @Column({ type: 'jsonb', default: [] })
  attendeeList!: MeetingAttendee[]

  @Column({ type: 'varchar', length: 20 })
  heldOn!: string

  /**
   * 참석자 as one line of names. Written from `attendeeList` when that is
   * given — the list and the search read it — and the only record of who was
   * there on minutes written before it.
   */
  @Column({ type: 'varchar', length: 500, default: '' })
  attendees!: string

  /** 회의 내용 — sanitized HTML from the rich-text editor. */
  @Column({ type: 'text', default: '' })
  body!: string

  /** 결정 사항 — kept apart from the notes because it is what gets acted on. */
  @Column({ type: 'text', default: '' })
  decisions!: string

  /**
   * Files handed out at the meeting — typically .hwp. Stored with the row
   * rather than in a table of their own: they are only ever read with the
   * minutes they belong to.
   */
  @Column({ type: 'jsonb', default: [] })
  attachments!: MeetingAttachment[]

  /**
   * 원본 자료 — the minutes as the office already wrote them (a .hwp, a
   * scan), shown in place when the entry is opened. Separate from the
   * attachments, which are what was handed out.
   */
  @Column({ type: 'jsonb', nullable: true })
  original!: MeetingAttachment | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date

  /**
   * Set when the admin deletes the record: it moves to 최근 삭제된 항목, is
   * hidden from every normal query, and can be restored for 30 days before
   * it is removed for good (see TrashService).
   */
  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt!: Date | null
}
