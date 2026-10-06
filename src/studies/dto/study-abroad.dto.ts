import { PartialType } from '@nestjs/mapped-types'
import { Transform } from 'class-transformer'
import { IsBoolean, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, ValidateIf } from 'class-validator'

const trimmed = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value)

/**
 * Every text comes in Korean and in Kyrgyz (`…Ky`); any of them may be left
 * empty except that a student needs a name in at least one of the two —
 * checked in the service, since it spans two fields.
 */
export class CreateStudyAbroadDto {
  @IsInt()
  @Min(1990)
  @Max(2100)
  year!: number

  @IsOptional()
  @Transform(trimmed)
  @IsString()
  @MaxLength(150)
  name?: string

  @IsOptional()
  @Transform(trimmed)
  @IsString()
  @MaxLength(150)
  nameKy?: string

  @IsOptional()
  @Transform(trimmed)
  @IsString()
  @MaxLength(255)
  university?: string

  @IsOptional()
  @Transform(trimmed)
  @IsString()
  @MaxLength(255)
  universityKy?: string

  @IsOptional()
  @Transform(trimmed)
  @IsString()
  @MaxLength(255)
  major?: string

  @IsOptional()
  @Transform(trimmed)
  @IsString()
  @MaxLength(255)
  majorKy?: string

  @IsOptional()
  @Transform(trimmed)
  @IsString()
  @MaxLength(255)
  programme?: string

  @IsOptional()
  @Transform(trimmed)
  @IsString()
  @MaxLength(255)
  programmeKy?: string

  @IsOptional()
  @Transform(trimmed)
  @IsString()
  @MaxLength(60)
  duration?: string

  @IsOptional()
  @Transform(trimmed)
  @IsString()
  @MaxLength(60)
  durationKy?: string

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
  @Transform(trimmed)
  @IsString()
  @MaxLength(255)
  noteKy?: string

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean
}

export class UpdateStudyAbroadDto extends PartialType(CreateStudyAbroadDto) {}
