import { IsString, MaxLength, MinLength } from 'class-validator'

export class LoginDto {
  @IsString()
  @MinLength(1, { message: 'validation.auth.usernameRequired' })
  @MaxLength(120)
  username!: string

  @IsString()
  @MaxLength(255)
  password!: string
}
