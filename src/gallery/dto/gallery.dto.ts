import { PartialType } from '@nestjs/mapped-types'
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUrl, Matches, Max, MaxLength, Min, MinLength, ValidateIf } from 'class-validator'

import { EVENT_TAGS, type EventTag } from '../entities/gallery-album.entity'

export class CreateAlbumDto {
  @IsInt()
  @Min(1990)
  @Max(2100)
  year!: number

  @IsString()
  @MinLength(1, { message: 'validation.album.titleRequired' })
  @MaxLength(255)
  title!: string

  @IsOptional()
  @IsIn(EVENT_TAGS)
  eventTag?: EventTag

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string

  /** Any https link; Google Photos album URLs are what the institute uses. */
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== '')
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true }, { message: 'validation.album.urlInvalid' })
  @MaxLength(500)
  albumUrl?: string | null

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Matches(/^\/uploads\/images\/[\w.-]+$/, { message: 'validation.staff.photoInvalid' })
  coverImage?: string | null

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== '')
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'validation.album.dateInvalid' })
  heldOn?: string | null

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean
}

export class UpdateAlbumDto extends PartialType(CreateAlbumDto) {}