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
 * 회의록 — internal minutes. Unlike every other table in this project these
 * rows never reach the public site: the controller marks *all* of its routes
 * `@Authenticated('admin')`, reads included.
 */
@Entity('meeting_minutes')
@Index('idx_meeting_held_on', ['heldOn'])
export class Meeting {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  /** 안건 / 회의명 */
  @Column({ type: 'varchar', length: 255 })
  title!: string

  @Column({ type: 'varchar', length: 20 })
  heldOn!: string

  /** 참석자 — a plain list of names, as the office writes it. */
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
