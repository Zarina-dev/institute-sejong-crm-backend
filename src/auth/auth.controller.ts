import { Body, Controller, Get, Post } from '@nestjs/common'

import { Authenticated, CurrentUser } from './auth.guard'
import { AuthService, type AuthUser } from './auth.service'
import { LoginDto } from './dto/login.dto'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** `{ role, token, student }` — the same endpoint for the admin and for students. */
  @Post('login')
  login(@Body() body: LoginDto) {
    return this.authService.login(body.username.trim(), body.password)
  }

  /** Lets a client check whether its stored token is still valid. */
  @Get('me')
  @Authenticated()
  me(@CurrentUser() user: AuthUser) {
    return { role: user.role, username: user.username, studentId: user.studentId ?? null, exp: user.exp }
  }
}