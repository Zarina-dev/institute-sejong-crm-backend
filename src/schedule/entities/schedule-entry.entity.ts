import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

/**
 * One class on the timetable. `date` is a real DATE and times are HH:mm
 * strings — Postgres TIME would work too, but the client only ever renders
 * them as text and never does time arithmetic.
 */
@Entity('schedule_entries')
@Index('idx_schedule_date_start', ['date', 'startTime'])
export class ScheduleEntry {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'date' })
  date!: string

  @Column({ type: 'varchar', length: 5 })
  startTime!: string

  @Column({ type: 'varchar', length: 5 })
  endTime!: string

  @Column({ type: 'varchar', length: 120 })
  subject!: string

  @Column({ type: 'varchar', length: 150, nullable: true })
  teacher!: string | null

  @Column({ type: 'varchar', length: 120, nullable: true })
  classroom!: string | null

  /** Course / group label, e.g. "한국어 1" — matches the catalog's course names. */
  @Index()
  @Column({ type: 'varchar', length: 120, nullable: true })
  courseGroup!: string | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date
}
