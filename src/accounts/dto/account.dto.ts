import { Type } from 'class-transformer'
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator'

import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '../passwords'
import { STAFF_ROLES, type StaffRole } from '../entities/staff-account.entity'

/** Letters, digits and . _ - ; 3–64 characters. Stored lower-cased. */
export const USERNAME_PATTERN = /^[A-Za-z0-9._-]{3,64}$/

export class CreateAccountDto {
  @IsString()
  @Matches(USERNAME_PATTERN, { message: 'validation.account.usernameFormat' })
  username!: string

  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH, { message: 'validation.account.passwordLength' })
  @MaxLength(PASSWORD_MAX_LENGTH, { message: 'validation.account.passwordLength' })
  password!: string

  @IsOptional()
  @IsString()
  @MaxLength(120, { message: 'validation.account.fullNameLength' })
  fullName?: string

  @IsOptional()
  @IsIn(STAFF_ROLES, { message: 'validation.account.roleInvalid' })
  role?: StaffRole
}

/** What an administrator may change besides the password and the status, each with its own route. */
export class UpdateAccountDto {
  @IsOptional()
  @IsString()
  @MaxLength(120, { message: 'validation.account.fullNameLength' })
  fullName?: string

  @IsOptional()
  @IsIn(STAFF_ROLES, { message: 'validation.account.roleInvalid' })
  role?: StaffRole
}

export class ChangePasswordDto {
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH, { message: 'validation.account.passwordLength' })
  @MaxLength(PASSWORD_MAX_LENGTH, { message: 'validation.account.passwordLength' })
  password!: string

  /** Required when changing one's own password; an administrator resetting someone else's leaves it out. */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  currentPassword?: string
}

export class SetAccountStatusDto {
  @IsBoolean()
  isActive!: boolean
}

export class ListAccountsQuery {
  /** Matches the username or the name, anywhere in either. */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  q?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number
}
