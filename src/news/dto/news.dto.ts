import { PartialType } from '@nestjs/mapped-types'
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

export const NEWS_CATEGORIES = ['academic', 'events', 'campus', 'admissions', 'press'] as const

export class CreateNewsDto {
  /** Optional cover image (site-relative /uploads/images/… URL). */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  coverImage?: string | null

  @IsString()
  @MinLength(1, { message: 'validation.news.titleRequired' })
  @MaxLength(255)
  title!: string

  /** Rich text (HTML from the editor); sanitized server-side before saving. */
  @IsString()
  @MinLength(1, { message: 'validation.news.bodyRequired' })
  @MaxLength(200000)
  body!: string

  @IsOptional()
  @IsIn(NEWS_CATEGORIES)
  category?: (typeof NEWS_CATEGORIES)[number]

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean
}

export class UpdateNewsDto extends PartialType(CreateNewsDto) {}
