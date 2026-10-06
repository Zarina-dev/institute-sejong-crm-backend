import { PartialType } from '@nestjs/mapped-types'
import { IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, ValidateIf } from 'class-validator'

import { BREAK_SEASONS, type BreakSeason, TERM_KINDS, type TermKind } from '../entities/term.entity'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export class CreateTermDto {
  @IsInt()
  @Min(1990)
  @Max(2100)
  year!: number

  @IsIn(TERM_KINDS, { message: 'validation.term.kindInvalid' })
  kind!: TermKind

  /** Which break: 봄 · 여름 · 가을 · 겨울방학. Ignored for a semester. */
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsIn(BREAK_SEASONS, { message: 'validation.term.kindInvalid' })
  season?: BreakSeason | null

  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string

  @Matches(ISO_DATE, { message: 'validation.term.dateInvalid' })
  startDate!: string

  @Matches(ISO_DATE, { message: 'validation.term.dateInvalid' })
  endDate!: string
}

export class UpdateTermDto extends PartialType(CreateTermDto) {}
