import { PartialType } from '@nestjs/mapped-types'
import { Type } from 'class-transformer'
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator'

import { COMPETITION_KINDS } from '../entities/competition.entity'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export class CompetitionWinnerDto {
  @IsInt()
  @Min(1)
  @Max(99)
  rank!: number

  @IsString()
  @MinLength(1, { message: 'validation.competition.winnerNameRequired' })
  @MaxLength(150)
  name!: string

  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string | null
}

export class CreateCompetitionDto {
  @IsIn(COMPETITION_KINDS, { message: 'validation.competition.kindInvalid' })
  kind!: (typeof COMPETITION_KINDS)[number]

  @IsString()
  @MinLength(1, { message: 'validation.competition.titleRequired' })
  @MaxLength(255)
  title!: string

  @IsInt()
  @Min(1990)
  @Max(2100)
  year!: number

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== '')
  @Matches(ISO_DATE, { message: 'validation.competition.dateInvalid' })
  heldOn?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(255)
  venue?: string

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(0)
  @Max(10000)
  participants?: number | null

  /** Sanitized on the way in, like the news body. */
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  summary?: string

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CompetitionWinnerDto)
  winners?: CompetitionWinnerDto[]

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Matches(/^\/uploads\/images\/[\w.-]+$/, { message: 'validation.staff.photoInvalid' })
  coverImage?: string | null

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== '')
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true }, { message: 'validation.album.urlInvalid' })
  @MaxLength(500)
  albumUrl?: string | null

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean
}

export class UpdateCompetitionDto extends PartialType(CreateCompetitionDto) {}
