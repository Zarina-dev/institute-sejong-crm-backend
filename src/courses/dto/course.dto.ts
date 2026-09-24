import { PartialType } from '@nestjs/mapped-types'
import { Type } from 'class-transformer'
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator'

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

  /** A class always runs between two dates; the timetable is unrolled from them. */
  @IsDateString({}, { message: 'validation.course.startDateRequired' })
  startDate!: string

  @IsDateString({}, { message: 'validation.course.endDateRequired' })
  endDate!: string

  @IsOptional()
  @IsInt()
  @Min(0)
  capacity?: number

  /* ---- Semester table (학사 일정) ------------------------------------- */

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(0)
  @Max(999)
  expectedStudents?: number | null

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(0)
  @Max(999)
  actualStudents?: number | null

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0)
  @Max(9999)
  totalHours?: number | null

  /** Left out or null → derived from `sessions`. */
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0)
  @Max(168)
  weeklyHours?: number | null

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean
}

export class UpdateCourseDto extends PartialType(CreateCourseDto) {}
