import { PartialType } from '@nestjs/mapped-types'
import { Type } from 'class-transformer'
import { ArrayMaxSize, IsArray, IsIn, IsInt, IsOptional, IsString, IsUUID, Matches, MaxLength, Min, MinLength, ValidateIf, ValidateNested } from 'class-validator'

import { ATTENDEE_ROLES, type AttendeeRole } from '../entities/meeting.entity'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export class MeetingAttachmentDto {
  /** Only files that came back from `POST /uploads/documents` are accepted. */
  @Matches(/^\/uploads\/documents\/[\w.-]+$/, { message: 'validation.meeting.attachmentInvalid' })
  url!: string

  @IsString()
  @MaxLength(255)
  name!: string

  @IsInt()
  @Min(0)
  size!: number

  @IsString()
  @MaxLength(255)
  type!: string
}

export class MeetingAttendeeDto {
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  staffId!: string | null

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string

  @IsIn(ATTENDEE_ROLES)
  role!: AttendeeRole

  @IsString()
  @MaxLength(160)
  position!: string
}

export class CreateMeetingDto {
  /**
   * Optional: minutes are named after the day they were written, so the
   * admin does not type a subject. Older rows keep whatever they carry.
   */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string

  @Matches(ISO_DATE, { message: 'validation.meeting.dateInvalid' })
  heldOn!: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  method?: string

  @IsOptional()
  @IsString()
  @MaxLength(200)
  place?: string

  @IsOptional()
  @IsString()
  @MaxLength(120)
  drafter?: string

  @IsOptional()
  @IsString()
  @MaxLength(120)
  approver?: string

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => MeetingAttendeeDto)
  attendeeList?: MeetingAttendeeDto[]

  @IsOptional()
  @IsString()
  @MaxLength(500)
  attendees?: string

  @IsOptional()
  @IsString()
  @MaxLength(50000)
  body?: string

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  decisions?: string

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => MeetingAttachmentDto)
  attachments?: MeetingAttachmentDto[]

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @ValidateNested()
  @Type(() => MeetingAttachmentDto)
  original?: MeetingAttachmentDto | null
}

export class UpdateMeetingDto extends PartialType(CreateMeetingDto) {}
