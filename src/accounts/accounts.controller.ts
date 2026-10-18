import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common'

import { Authenticated, CurrentUser } from '../auth/auth.guard'
import { AuthService, type AuthUser } from '../auth/auth.service'
import { AccountsService } from './accounts.service'
import { ChangePasswordDto, CreateAccountDto, ListAccountsQuery, SetAccountStatusDto, UpdateAccountDto } from './dto/account.dto'

/**
 * Sign-in accounts (staff_accounts). `/staff` is the public 교직원 list, so
 * the logins live here. Administrators only — except the password route,
 * where anyone may change their own.
 */
@Controller('accounts')
export class AccountsController {
  constructor(
    private readonly accounts: AccountsService,
    private readonly auth: AuthService,
  ) {}

  /** `{ items, total, page, pageSize }`; `?q=` searches the username and the name. */
  @Get()
  @Authenticated('ADMIN')
  list(@Query() query: ListAccountsQuery) {
    return this.accounts.list(query)
  }

  @Get(':id')
  @Authenticated('ADMIN')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.accounts.getById(id)
  }

  @Post()
  @Authenticated('ADMIN')
  create(@Body() body: CreateAccountDto) {
    return this.accounts.create(body)
  }

  /** Name and role. */
  @Patch(':id')
  @Authenticated('ADMIN')
  update(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() body: UpdateAccountDto) {
    return this.accounts.update(user, id, body)
  }

  /**
   * One's own password (with the current one), or — for an administrator —
   * anyone's. The account's other sessions end; changing one's own answers
   * with a fresh token so this one goes on.
   */
  @Patch(':id/password')
  @Authenticated()
  async changePassword(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() body: ChangePasswordDto) {
    const account = await this.accounts.changePassword(user, id, body)
    return account.id === user.id ? this.auth.session(account) : { user: (await this.accounts.getById(account.id)) }
  }

  @Patch(':id/status')
  @Authenticated('ADMIN')
  setStatus(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() body: SetAccountStatusDto) {
    return this.accounts.setStatus(user, id, body.isActive)
  }

  @Delete(':id')
  @Authenticated('ADMIN')
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.accounts.remove(user, id)
  }
}
