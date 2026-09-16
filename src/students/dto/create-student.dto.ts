import { Type } from 'class-transformer'
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator'

export class TopikFileDto {
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

  /** Only files that went through `POST /uploads/documents` are accepted. */
  @IsOptional()
  @Matches(/^\/uploads\/documents\/[\w.-]+$/, { message: 'validation.staff.photoInvalid' })
  url?: string
}

export class CreateStudentDto {
  @IsString()
  @MinLength(1, { message: 'validation.student.nameRequired' })
  @MaxLength(120)
  name!: string

  /** Login id. Letters, digits, dash, underscore, dot — no spaces. */
  @IsString()
  @MinLength(1, { message: 'validation.student.idRequired' })
  @MaxLength(120)
  @Matches(/^[\p{L}\p{N}._-]+$/u, { message: 'validation.student.idFormat' })
  studentId!: string

  @IsEmail({}, { message: 'validation.student.emailInvalid' })
  @MaxLength(255)
  email!: string

  @IsString()
  @MinLength(1, { message: 'validation.student.phoneRequired' })
  @MaxLength(80)
  phone!: string

  @IsString()
  @MinLength(1, { message: 'validation.student.courseRequired' })
  @MaxLength(120)
  course!: string

  @IsString()
  @MinLength(1, { message: 'validation.student.levelRequired' })
  @MaxLength(120)
  level!: string

  @IsOptional()
  @IsDateString({}, { message: 'validation.student.admissionDate' })
  admissionDate?: string | null

  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: 'active' | 'inactive'

  @IsOptional()
  @IsString()
  @MinLength(4, { message: 'validation.student.passwordShort' })
  @MaxLength(255)
  password?: string

  /** Free-form admin note about the student (visa, payment, remarks…). */
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(2)
  @ValidateNested({ each: true })
  @Type(() => TopikFileDto)
  topikFiles?: TopikFileDto[]
}
