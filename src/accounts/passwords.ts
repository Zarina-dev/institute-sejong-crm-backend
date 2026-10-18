import * as argon2 from 'argon2'

/** Shortest password an account may be given. Long beats clever: no character-class rules. */
export const PASSWORD_MIN_LENGTH = 10
/** argon2 takes any length; the cap keeps a megabyte "password" from being hashed. */
export const PASSWORD_MAX_LENGTH = 128

/** argon2id with the library's defaults (64 MiB, 3 passes, 4 lanes) — OWASP's recommended shape. */
export const hashPassword = (password: string) => argon2.hash(password, { type: argon2.argon2id })

/** False for a wrong password and for a stored value that is not a hash at all. */
export async function verifyPassword(hash: string, password: string) {
  try {
    return await argon2.verify(hash, password)
  } catch {
    return false
  }
}

let dummyHash: Promise<string> | null = null

/**
 * A sign-in for a username that does not exist still checks a password
 * against a hash, so the answer takes as long as for a real account and
 * the timing does not tell which usernames exist.
 */
export async function burnPasswordCheck(password: string) {
  dummyHash ??= hashPassword('not-a-real-password-just-for-timing')
  await verifyPassword(await dummyHash, password)
}

/** Usernames are compared lower-cased and trimmed: "Admin " and "admin" are one account. */
export const normalizeUsername = (username: string) => username.trim().toLowerCase()
