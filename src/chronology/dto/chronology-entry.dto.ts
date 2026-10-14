import { PartialType } from '@nestjs/mapped-types'
import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength, ValidateIf } from 'class-validator'
import { IsTranslations, type Translations } from '../../common/translations'

export class CreateChronologyEntryDto {
  @IsInt()
  @Min(1900)
  @Max(2100)
  year!: number

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number | null

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(1)
  @Max(31)
  day?: number | null

  @IsString()
  @MinLength(1, { message: 'validation.chronology.titleRequired' })
  @MaxLength(255)
  title!: string

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string

  @IsOptional()
  @IsBoolean()
  isMilestone?: boolean

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean

  @IsOptional()
  @IsTranslations({ title: 255, description: 2000 })
  translations?: Translations
}

export class UpdateChronologyEntryDto extends PartialType(CreateChronologyEntryDto) {}
