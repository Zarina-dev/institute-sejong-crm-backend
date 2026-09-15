import { PartialType } from '@nestjs/mapped-types'
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

export const NEWS_CATEGORIES = ['academic', 'events', 'campus', 'admissions'] as const

export class CreateNewsDto {
  @IsString()
  @MinLength(1, { message: 'validation.news.titleRequired' })
  @MaxLength(255)
  title!: string

  @IsString()
  @MinLength(1, { message: 'validation.news.bodyRequired' })
  @MaxLength(20000)
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
