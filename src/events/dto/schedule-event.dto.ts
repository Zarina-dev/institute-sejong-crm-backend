import { PartialType } from '@nestjs/mapped-types'
import { IsBoolean, IsOptional, IsString, Matches, MaxLength, MinLength, ValidateIf } from 'class-validator'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export class CreateScheduleEventDto {
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== '')
  @Matches(/^\d{4}-[12b]\d?$/, { message: 'validation.course.termInvalid' })
  termCode?: string | null

  @Matches(ISO_DATE, { message: 'validation.event.dateInvalid' })
  startDate!: string

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== '')
  @Matches(ISO_DATE, { message: 'validation.event.dateInvalid' })
  endDate?: string | null

  @IsString()
  @MinLength(1, { message: 'validation.event.titleRequired' })
  @MaxLength(255)
  title!: string

  @IsOptional()
  @IsString()
  @MaxLength(255)
  titleKy?: string

  @IsOptional()
  @IsString()
  @MaxLength(255)
  titleRu?: string

  @IsOptional()
  @IsString()
  @MaxLength(255)
  titleEn?: string

  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean
}

export class UpdateScheduleEventDto extends PartialType(CreateScheduleEventDto) {}
