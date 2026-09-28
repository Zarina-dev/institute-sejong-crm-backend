import { PartialType } from '@nestjs/mapped-types'
import { IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export class CreateTermDto {
  @IsInt()
  @Min(1990)
  @Max(2100)
  year!: number

  @IsIn([1, 2], { message: 'validation.term.halfInvalid' })
  half!: number

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
