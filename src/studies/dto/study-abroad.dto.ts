import { PartialType } from '@nestjs/mapped-types'
import { Transform } from 'class-transformer'
import { IsBoolean, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength, ValidateIf } from 'class-validator'

const trimmed = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value)

export class CreateStudyAbroadDto {
  @IsInt()
  @Min(1990)
  @Max(2100)
  year!: number

  @Transform(trimmed)
  @IsString()
  @MinLength(1, { message: 'validation.study.nameRequired' })
  @MaxLength(150)
  name!: string

  @IsOptional()
  @Transform(trimmed)
  @IsString()
  @MaxLength(255)
  university?: string

  @IsOptional()
  @Transform(trimmed)
  @IsString()
  @MaxLength(255)
  major?: string

  @IsOptional()
  @Transform(trimmed)
  @IsString()
  @MaxLength(255)
  programme?: string

  @IsOptional()
  @Transform(trimmed)
  @IsString()
  @MaxLength(60)
  duration?: string

  /** Only images uploaded through the site. */
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Matches(/^\/uploads\/images\/[\w.-]+$/, { message: 'validation.staff.photoInvalid' })
  photo?: string | null

  @IsOptional()
  @Transform(trimmed)
  @IsString()
  @MaxLength(255)
  note?: string

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean
}

export class UpdateStudyAbroadDto extends PartialType(CreateStudyAbroadDto) {}
