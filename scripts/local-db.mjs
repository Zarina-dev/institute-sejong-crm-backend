/**
 * Local PostgreSQL for development, without installing one.
 *
 * The server is the real thing — the community build of the PostgreSQL
 * binaries published on npm — started against a data directory inside this
 * repo (`.pgdata`, git-ignored). Nothing is installed system-wide and no
 * administrator rights are needed; deleting the folder deletes the database.
 *
 *   npm run db          start it (keeps running; Ctrl+C stops it)
 *   npm run db -- stop  stop a server left running from an earlier session
 *
 * Connection details come from DATABASE_URL, and its default is the API's
 * too: postgres / postgres on 5432, database `institut`.
 */
import EmbeddedPostgres from 'embedded-postgres'
import pkg from 'pg'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const { Client } = pkg

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const url = new URL(process.env.DATABASE_URL?.trim() || 'postgres://postgres:postgres@localhost:5432/institut')
const user = decodeURIComponent(url.username) || 'postgres'
const password = decodeURIComponent(url.password) || 'postgres'
const port = Number(url.port || 5432)
const databaseDir = join(root, '.pgdata')

const postgres = new EmbeddedPostgres({
  databaseDir,
  user,
  password,
  port,
  persistent: true,
})

if (process.argv[2] === 'stop') {
  await postgres.stop()
  console.log('postgres stopped')
  process.exit(0)
}

// `initialise` lays down the cluster; PG_VERSION is how we know it already ran.
if (!existsSync(join(databaseDir, 'PG_VERSION'))) {
  console.log('initialising the cluster in .pgdata …')
  await postgres.initialise()
}

await postgres.start()

/**
 * `initdb` takes its encoding from the Windows locale, which here is
 * WIN1251 — Korean cannot be stored in that. The database the API uses is
 * therefore created from template0 as UTF-8 explicitly, rather than through
 * the helper, which would inherit the cluster's encoding.
 */
const database = decodeURIComponent(url.pathname.slice(1)) || 'institut'
const client = new Client({
  host: 'localhost',
  port,
  user,
  password,
  database: 'postgres',
})

await client.connect()

const existing = await client.query('SELECT pg_encoding_to_char(encoding) AS encoding FROM pg_database WHERE datname = $1', [database])

if (existing.rowCount === 0) {
  await client.query(`CREATE DATABASE "${database}" WITH ENCODING 'UTF8' LC_COLLATE 'C' LC_CTYPE 'C' TEMPLATE template0`)
  console.log(`created the database ${database} (UTF8)`)
} else if (existing.rows[0].encoding !== 'UTF8') {
  throw new Error(`database ${database} is ${existing.rows[0].encoding}, not UTF8 — drop it and run this script again`)
}

await client.end()

console.log(`postgres is listening on ${port} · data in ${databaseDir}`)

const shutdown = async () => {
  await postgres.stop()
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
