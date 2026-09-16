import { Transform } from 'class-transformer'
import { IsBoolean, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator'

/** Multipart fields arrive as strings; "true"/"false" become booleans. */
const toBoolean = ({ value }: { value: unknown }) =>
  value === true || value === 'true' ? true : value === false || value === 'false' ? false : value

/**
 * Body of `POST /materials` (multipart, file under `file`) and the base for
 * updates. Only these properties survive the global ValidationPipe
 * (`whitelist` + `forbidNonWhitelisted`); anything else — `id`, `storageKey`,
 * `createdAt` — is rejected with a 400 instead of being written to the row.
 */
export class CreateMaterialDto {
  @IsString()
  @MinLength(1, { message: 'validation.material.titleRequired' })
  @MaxLength(255)
  title!: string

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string | null

  /** Course record the material belongs to; subject and course labels are derived from it. */
  @IsUUID('4', { message: 'validation.material.courseRequired' })
  courseId!: string

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isPublished?: boolean
}
