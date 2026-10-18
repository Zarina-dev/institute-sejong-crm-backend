/**
 * Copies this database into another one — e.g. the local database into
 * Railway's PostgreSQL — in one command, with nothing to install:
 *
 *   npm run build
 *   npm run db:copy -- --to "postgresql://…railway…"          (Railway: DATABASE_PUBLIC_URL)
 *   npm run db:copy -- --to "…" --force                        (the target already has rows: replace them)
 *
 * The source is DATABASE_URL (backend/.env), or --from "<url>".
 *
 * 1. The target gets the schema from the migrations (dist/database/migrations),
 *    exactly as the API would make it on start — so run `npm run build` first.
 * 2. Every table is copied row for row, as JSON through
 *    json_populate_recordset, so every type (jsonb, arrays, timestamps,
 *    enums) arrives as it was. Foreign keys and triggers are held off during
 *    the copy (session_replication_role), so the order of tables does not matter.
 * 3. Sequences continue after the copied rows.
 * 4. Each table's row count is compared, source against target.
 *
 * It all happens in one transaction: a failure leaves the target as it was.
 * A target that already holds rows is refused unless --force is given.
 * Stop the API that uses the target while this runs.
 */
import { config } from 'dotenv'
import { createRequire } from 'node:module'
import pg from 'pg'

config({ path: ['.env', '.env.local'], quiet: true })
const require = createRequire(import.meta.url)

const argument = (name) => {
  const index = process.argv.indexOf(name)
  return index > -1 ? process.argv[index + 1] : undefined
}
const from = argument('--from') || process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/institut'
const to = argument('--to')
const force = process.argv.includes('--force')
const BATCH = 500

if (!to) {
  console.error('Where to? npm run db:copy -- --to "postgresql://user:password@host:port/database"')
  process.exit(1)
}
if (to === from) {
  console.error('The source and the target are the same database.')
  process.exit(1)
}

const isLocal = (url) => /@(localhost|127\.0\.0\.1|\[::1\])(:|\/)/.test(url)
// Railway's public proxy speaks TLS; its certificate is not one Node knows.
const connect = (url) => new pg.Client({ connectionString: url, ssl: isLocal(url) ? false : { rejectUnauthorized: false } })
const hostOf = (url) => new URL(url).host
const q = (name) => `"${name.replace(/"/g, '""')}"`

const tablesOf = async (client) =>
  (await client.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY 1`)).rows.map(
    (row) => row.table_name,
  )
const columnsOf = async (client, table) =>
  // Generated columns are computed by the target itself and cannot be written.
  (
    await client.query(
      `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 AND is_generated = 'NEVER' ORDER BY ordinal_position`,
      [table],
    )
  ).rows.map(
    (row) => row.column_name,
  )
const countOf = async (client, table) => (await client.query(`SELECT count(*)::int AS n FROM ${q(table)}`)).rows[0].n

async function migrateTarget() {
  // The API's own migrations, compiled: the target ends up with the schema the API expects.
  const { DataSource } = require('typeorm')
  const { databaseOptions } = require('../dist/database/database.options.js')
  const options = databaseOptions()
  const dataSource = new DataSource({ ...options, url: to, ssl: isLocal(to) ? undefined : { rejectUnauthorized: false } })
  await dataSource.initialize()
  try {
    const applied = await dataSource.runMigrations({ transaction: 'each' })
    console.log(applied.length ? `Schema: applied ${applied.length} migration(s): ${applied.map((m) => m.name).join(', ')}.` : 'Schema: already up to date.')
  } finally {
    await dataSource.destroy()
  }
}

async function main() {
  console.log(`From ${hostOf(from)} → to ${hostOf(to)}`)

  try {
    require.resolve('../dist/database/database.options.js')
  } catch {
    console.error('Build first: npm run build (the migrations are read from dist/).')
    process.exit(1)
  }

  await migrateTarget()

  const source = connect(from)
  const target = connect(to)
  await source.connect()
  await target.connect()

  try {
    const sourceTables = (await tablesOf(source)).filter((table) => table !== 'migrations')
    const targetTables = new Set(await tablesOf(target))
    const tables = sourceTables.filter((table) => targetTables.has(table))
    const missing = sourceTables.filter((table) => !targetTables.has(table))
    if (missing.length) console.warn(`Not in the target's schema, skipped: ${missing.join(', ')} (is dist/ older than the source database?)`)

    // Refuse to overwrite real data by accident.
    const occupied = []
    for (const table of tables) if ((await countOf(target, table)) > 0) occupied.push(table)
    if (occupied.length && !force) {
      console.error(`The target already has rows in: ${occupied.join(', ')}.\nRun again with --force to replace them with the source's.`)
      process.exitCode = 1
      return
    }

    await source.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY') // one consistent snapshot of the source
    await target.query('BEGIN')
    await target.query('SET LOCAL session_replication_role = replica') // no FK checks or triggers while copying

    if (tables.length) await target.query(`TRUNCATE ${tables.map(q).join(', ')} CASCADE`)

    const report = []
    for (const table of tables) {
      const targetColumns = new Set(await columnsOf(target, table))
      const columns = (await columnsOf(source, table)).filter((column) => targetColumns.has(column))
      const list = columns.map(q).join(', ')
      let copied = 0

      for (let offset = 0; ; offset += BATCH) {
        const { rows } = await source.query(`SELECT row_to_json(t) AS r FROM (SELECT ${list} FROM ${q(table)} ORDER BY ctid OFFSET $1 LIMIT $2) t`, [
          offset,
          BATCH,
        ])
        if (rows.length === 0) break
        await target.query(`INSERT INTO ${q(table)} (${list}) SELECT ${list} FROM json_populate_recordset(NULL::${q(table)}, $1::json)`, [
          JSON.stringify(rows.map((row) => row.r)),
        ])
        copied += rows.length
        if (rows.length < BATCH) break
      }
      report.push({ table, copied })
    }

    // Serial columns continue after the highest copied value.
    const sequences = await target.query(
      `SELECT c.table_name, c.column_name, pg_get_serial_sequence(quote_ident(c.table_name), c.column_name) AS seq
         FROM information_schema.columns c
        WHERE c.table_schema = 'public' AND c.column_default LIKE 'nextval(%'`,
    )
    for (const { table_name, column_name, seq } of sequences.rows) {
      if (!seq || !tables.includes(table_name)) continue
      await target.query(`SELECT setval($1, COALESCE((SELECT max(${q(column_name)}) FROM ${q(table_name)}), 0) + 1, false)`, [seq])
    }

    await target.query('COMMIT')
    await source.query('COMMIT')

    // Compare, outside the copy: what the target holds now against the source.
    let mismatches = 0
    console.log('\nTable                         source   target')
    for (const { table } of report) {
      const [a, b] = [await countOf(source, table), await countOf(target, table)]
      if (a !== b) mismatches += 1
      console.log(`${table.padEnd(28)} ${String(a).padStart(7)}  ${String(b).padStart(7)}${a === b ? '' : '   ← differs'}`)
    }
    console.log(mismatches ? `\n${mismatches} table(s) differ.` : `\nDone: ${report.length} tables copied, every count matches.`)
    if (mismatches) process.exitCode = 1
  } catch (error) {
    await target.query('ROLLBACK').catch(() => {})
    await source.query('ROLLBACK').catch(() => {})
    console.error(`Copy failed, the target is unchanged: ${error.message}`)
    process.exitCode = 1
  } finally {
    await source.end()
    await target.end()
  }
}

await main()
