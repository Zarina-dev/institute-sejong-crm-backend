import { PartialType } from '@nestjs/mapped-types'
import { IsBoolean, IsEmail, IsInt, IsOptional, IsString, Matches, MaxLength, Min, MinLength, ValidateIf } from 'class-validator'

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
}

export class UpdateStaffDto extends PartialType(CreateStaffDto) {}
