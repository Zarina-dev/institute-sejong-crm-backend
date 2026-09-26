import { PartialType } from '@nestjs/mapped-types'
import { ArrayMaxSize, ArrayMinSize, IsBoolean, IsInt, IsOptional, IsString, IsUUID, IsUrl, Matches, MaxLength, Min, MinLength, ValidateIf } from 'class-validator'

export class CreateTextbookDto {
  @IsString()
  @MinLength(1, { message: 'validation.textbook.titleRequired' })
  @MaxLength(255)
  title!: string

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string

  /** Only images uploaded through the site are accepted. */
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Matches(/^\/uploads\/images\/[\w.-]+$/, { message: 'validation.staff.photoInvalid' })
  coverImage?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(255)
  purchasePlace?: string

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== '')
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true }, { message: 'validation.textbook.urlInvalid' })
  @MaxLength(500)
  purchaseUrl?: string | null

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean
}

export class UpdateTextbookDto extends PartialType(CreateTextbookDto) {}

export class ReorderTextbooksDto {
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @IsUUID('4', { each: true })
  ids!: string[]
}
