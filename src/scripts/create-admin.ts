/**
 * Makes an administrator account — the first one, or another when every
 * administrator has lost their password. Never run by the API itself.
 *
 *   npm run admin:create -- --username <name> [--full-name "<name>"] [--another]
 *
 * The password is asked for twice, without echoing it. Where nothing can be
 * typed (a deploy shell, CI) it is read from ADMIN_INITIAL_PASSWORD instead —
 * set it for that one command only, never in .env:
 *
 *   ADMIN_INITIAL_PASSWORD='…' npm run admin:create -- --username admin
 *
 * Refuses, changing nothing, when the username is taken, or when an active
 * administrator already exists (pass --another to add one anyway). Applies
 * pending migrations first, so it works on a fresh database. Neither the
 * password nor its hash is ever printed. Run `npm run build` first.
 */
import { config } from 'dotenv'

import { USERNAME_PATTERN } from '../accounts/dto/account.dto'
import { StaffAccount } from '../accounts/entities/staff-account.entity'
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, hashPassword, normalizeUsername } from '../accounts/passwords'
import dataSource from '../database/data-source'

config({ path: ['.env', '.env.local'], quiet: true })

function option(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`)
  const value = index >= 0 ? process.argv[index + 1] : undefined
  return value && !value.startsWith('--') ? value : undefined
}

/** Reads a line from the terminal without showing what is typed. */
function askHidden(question: string): Promise<string> {
  const input = process.stdin

  return new Promise((resolve, reject) => {
    if (!input.isTTY) {
      reject(new Error('No terminal to type the password in. Set ADMIN_INITIAL_PASSWORD for this one command instead.'))
      return
    }

    process.stdout.write(question)
    input.setRawMode(true)
    input.setEncoding('utf8')
    input.resume()
    let value = ''

    const finish = () => {
      input.off('data', onData)
      input.setRawMode(false)
      input.pause()
      process.stdout.write('\n')
    }

    const onData = (chunk: string) => {
      for (const character of chunk) {
        if (character === '\r' || character === '\n') {
          finish()
          resolve(value)
          return
        }
        if (character === '\u0003') {
          finish()
          reject(new Error('Cancelled.'))
          return
        }
        value = character === '\u007f' || character === '\b' ? value.slice(0, -1) : value + character
      }
    }

    input.on('data', onData)
  })
}

async function readPassword() {
  const fromEnvironment = process.env.ADMIN_INITIAL_PASSWORD
  if (fromEnvironment) return fromEnvironment

  const password = await askHidden('Password: ')
  if (password !== (await askHidden('Repeat the password: '))) throw new Error('The two passwords differ. Nothing was changed.')
  return password
}

async function main() {
  const rawUsername = option('username')
  const fullName = option('full-name')?.trim() ?? ''
  const another = process.argv.includes('--another')

  if (!rawUsername || !USERNAME_PATTERN.test(rawUsername.trim())) {
    throw new Error('Give a --username of 3–64 characters: Latin letters, digits, dot, dash or underscore.')
  }
  if (fullName.length > 120) throw new Error('--full-name is at most 120 characters.')
  const username = normalizeUsername(rawUsername)

  await dataSource.initialize()

  try {
    await dataSource.runMigrations({ transaction: 'each' })
    const accounts = dataSource.getRepository(StaffAccount)

    if (await accounts.exists({ where: { username } })) {
      throw new Error(`An account "${username}" already exists. Nothing was changed — reset its password from the admin panel instead.`)
    }
    if (!another && (await accounts.exists({ where: { role: 'ADMIN', isActive: true } }))) {
      throw new Error('An active administrator already exists. Nothing was changed. Pass --another to add one more.')
    }

    const password = await readPassword()
    if (password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) {
      throw new Error(`The password must be ${PASSWORD_MIN_LENGTH}–${PASSWORD_MAX_LENGTH} characters. Nothing was changed.`)
    }

    await accounts.insert({ username, fullName, role: 'ADMIN', isActive: true, passwordHash: await hashPassword(password) })
    console.log(`Administrator "${username}" created. Sign in at /login.`)
  } finally {
    await dataSource.destroy()
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
