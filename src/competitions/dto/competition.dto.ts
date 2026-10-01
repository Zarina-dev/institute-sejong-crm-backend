import { PartialType } from '@nestjs/mapped-types'
import { Transform, Type } from 'class-transformer'
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
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

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

const trimmed = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value)

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
  /**
   * `speech`, `writing`, or the name of a competition the institute has
   * started running since. The list is open, so this is only checked for
   * being a name at all.
   */
  @Transform(trimmed)
  @IsString()
  @MinLength(1, { message: 'validation.competition.kindInvalid' })
  @MaxLength(60, { message: 'validation.competition.kindInvalid' })
  kind!: string

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

  /** Only images uploaded through the site; the order is the display order. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @Matches(/^\/uploads\/images\/[\w.-]+$/, { each: true, message: 'validation.staff.photoInvalid' })
  images?: string[]

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
