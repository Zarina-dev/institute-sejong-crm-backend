import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

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

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date
}
