import { PartialType } from '@nestjs/mapped-types'
import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength, ValidateIf } from 'class-validator'

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
}

export class UpdateChronologyEntryDto extends PartialType(CreateChronologyEntryDto) {}
