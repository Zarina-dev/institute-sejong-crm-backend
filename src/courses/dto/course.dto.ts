import { PartialType } from '@nestjs/mapped-types'
import { Type } from 'class-transformer'
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator'

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
  @IsString()
  @MaxLength(120)
  level?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(150)
  teacherName?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(150)
  schedule?: string | null

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

export class ApplicationDocumentDto {
  @IsString()
  @MaxLength(64)
  id!: string

  @IsString()
  @MaxLength(255)
  name!: string

  @IsInt()
  @Min(0)
  size!: number

  @IsString()
  @MaxLength(120)
  type!: string

  @IsOptional()
  @IsString()
  dataUrl?: string
}

export class CreateApplicationDto {
  @IsUUID()
  courseId!: string

  @IsString()
  @MinLength(1, { message: 'validation.application.nameRequired' })
  @MaxLength(120)
  applicantName!: string

  @IsEmail({}, { message: 'validation.application.emailInvalid' })
  @MaxLength(120)
  applicantEmail!: string

  @IsOptional()
  @IsString()
  @MaxLength(120)
  phone?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(120)
  goal?: string | null

  @IsOptional()
  @IsUUID()
  studentId?: string | null

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => ApplicationDocumentDto)
  documents?: ApplicationDocumentDto[]
}

export class UpdateApplicationStatusDto {
  @IsIn(['approved', 'rejected', 'enrolled'])
  status!: 'approved' | 'rejected' | 'enrolled'
}

export class CreateEnrollmentDto {
  @IsUUID()
  studentId!: string

  @IsUUID()
  courseId!: string
}
