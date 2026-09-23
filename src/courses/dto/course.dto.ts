import { PartialType } from '@nestjs/mapped-types'
import { Type } from 'class-transformer'
import { ArrayMaxSize, IsArray, IsBoolean, IsDateString, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator'

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/

export const COURSE_CATEGORIES = ['language', 'culture'] as const

export class CourseSessionDto {
  @IsInt()
  @Min(1)
  @Max(7)
  weekday!: 1 | 2 | 3 | 4 | 5 | 6 | 7

  @Matches(TIME, { message: 'validation.schedule.timeInvalid' })
  startTime!: string

  @Matches(TIME, { message: 'validation.schedule.timeInvalid' })
  endTime!: string

  @IsOptional()
  @IsString()
  @MaxLength(120)
  classroom?: string | null
}

export class CreateCourseDto {
  @IsString()
  @MinLength(1, { message: 'validation.course.titleRequired' })
  @MaxLength(255)
  title!: string

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string | null

  @IsString()
  @MinLength(1, { message: 'validation.course.subjectRequired' })
  @MaxLength(120)
  subject!: string

  @IsOptional()
  @IsIn(COURSE_CATEGORIES)
  category?: (typeof COURSE_CATEGORIES)[number]

  @IsOptional()
  @IsString()
  @MaxLength(120)
  level?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(150)
  teacherName?: string | null

  /** Weekly meetings; at most one per weekday slot is sensible but not enforced. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(14)
  @ValidateNested({ each: true })
  @Type(() => CourseSessionDto)
  sessions?: CourseSessionDto[]

  @IsOptional()
  @IsString()
  @MaxLength(120)
  classroom?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(120)
  courseCode?: string | null

  @IsOptional()
  @IsDateString()
  startDate?: string | null

  @IsOptional()
  @IsDateString()
  endDate?: string | null

  @IsOptional()
  @IsInt()
  @Min(0)
  capacity?: number

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean
}

export class UpdateCourseDto extends PartialType(CreateCourseDto) {}
