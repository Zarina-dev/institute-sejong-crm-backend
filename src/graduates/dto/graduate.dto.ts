import { PartialType } from '@nestjs/mapped-types'
import { Transform } from 'class-transformer'
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator'

const trimmed = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value)

/** A graduate needs a name in Korean or in Kyrgyz — checked in the service, since it spans two fields. */
export class CreateGraduateDto {
  @IsInt()
  @Min(1990)
  @Max(2100)
  year!: number

  @IsInt()
  @IsIn([1, 2], { message: 'validation.graduate.termInvalid' })
  term!: number

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

export class UpdateGraduateDto extends PartialType(CreateGraduateDto) {}
