import { PartialType } from '@nestjs/mapped-types'
import { ArrayMaxSize, ArrayMinSize, IsBoolean, IsEmail, IsInt, IsOptional, IsString, IsUUID, Matches, MaxLength, Min, MinLength, ValidateIf } from 'class-validator'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export class CreateStaffDto {
  @IsString()
  @MinLength(1, { message: 'validation.staff.nameRequired' })
  @MaxLength(120)
  name!: string

  @IsString()
  @MinLength(1, { message: 'validation.staff.positionRequired' })
  @MaxLength(160)
  position!: string

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  bio?: string

  /** Only same-origin uploads are accepted — the photo must come through `/uploads/images`. */
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @Matches(/^\/uploads\/images\/[\w.-]+$/, { message: 'validation.staff.photoInvalid' })
  photoUrl?: string | null

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== '')
  @IsEmail({}, { message: 'validation.student.emailInvalid' })
  @MaxLength(255)
  email?: string | null

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean

  /** 근무 시작일 — may lie ahead for someone joining next month. */
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Matches(ISO_DATE, { message: 'validation.staff.dateInvalid' })
  startDate?: string | null

  /** 퇴직일 — only for someone who has left (or is about to). */
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Matches(ISO_DATE, { message: 'validation.staff.dateInvalid' })
  endDate?: string | null
}

export class UpdateStaffDto extends PartialType(CreateStaffDto) {}

export class ReorderStaffDto {
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @IsUUID('4', { each: true })
  ids!: string[]
}
