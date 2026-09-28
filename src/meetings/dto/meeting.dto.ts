import { PartialType } from '@nestjs/mapped-types'
import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export class CreateMeetingDto {
  @IsString()
  @MinLength(1, { message: 'validation.meeting.titleRequired' })
  @MaxLength(255)
  title!: string

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
}

export class UpdateMeetingDto extends PartialType(CreateMeetingDto) {}
