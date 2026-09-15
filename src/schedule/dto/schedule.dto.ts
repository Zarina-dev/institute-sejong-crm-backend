import { PartialType } from '@nestjs/mapped-types'
import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator'

const DATE = /^\d{4}-\d{2}-\d{2}$/
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/

export class CreateScheduleEntryDto {
  @Matches(DATE, { message: 'validation.schedule.dateInvalid' })
  date!: string

  @Matches(TIME, { message: 'validation.schedule.timeInvalid' })
  startTime!: string

  @Matches(TIME, { message: 'validation.schedule.timeInvalid' })
  endTime!: string

  @IsString()
  @MinLength(1, { message: 'validation.schedule.subjectRequired' })
  @MaxLength(120)
  subject!: string

  @IsOptional()
  @IsString()
  @MaxLength(150)
  teacher?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(120)
  classroom?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(120)
  courseGroup?: string | null
}

export class UpdateScheduleEntryDto extends PartialType(CreateScheduleEntryDto) {}
