import { PartialType } from '@nestjs/mapped-types'
import { Type } from 'class-transformer'
import { ArrayMaxSize, IsArray, IsInt, IsOptional, IsString, Matches, MaxLength, Min, ValidateNested } from 'class-validator'

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
}

export class UpdateMeetingDto extends PartialType(CreateMeetingDto) {}
