import { Body, Controller, Get, HttpCode, Post, Req } from '@nestjs/common'
import type { Request } from 'express'

import { Authenticated, CurrentUser } from './auth.guard'
import { AuthService, type AuthUser } from './auth.service'
import { clientIp } from '../audit/client-info'
import { LoginDto } from './dto/login.dto'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** `{ token, user }` for an active account and its password; one 401 message for every refusal. */
  @Post('login')
  @HttpCode(200)
  login(@Body() body: LoginDto, @Req() request: Request) {
    return this.authService.login(body.username, body.password, clientIp(request))
  }

  /** Ends the account's sessions on the server; the client forgets its token too. */
  @Post('logout')
  @HttpCode(204)
  @Authenticated()
  async logout(@CurrentUser() user: AuthUser) {
    await this.authService.logout(user)
  }

  /** The signed-in account as it is now (name and role read from the database), and when the token expires. */
  @Get('me')
  @Authenticated()
  me(@CurrentUser() user: AuthUser) {
    return { id: user.id, username: user.username, fullName: user.fullName, role: user.role, exp: user.exp }
  }
}
