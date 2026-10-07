/**
 * Moves everything under uploads/ into Cloudflare R2, and checks it.
 *
 *   npm run build
 *   npm run uploads:migrate -- --dry-run   what would be copied, nothing written
 *   npm run uploads:migrate                copy, verify, update references
 *   npm run uploads:migrate -- --verify    every file a record names exists in R2
 *
 * - uploads/images, uploads/videos → the public bucket; uploads/documents,
 *   uploads/materials → the private one. The key is the path under uploads/
 *   (images/<uuid>.png), so folders, names and extensions are kept as they
 *   are, and the /uploads/<kind>/<file> paths records hold stay valid.
 * - A file R2 already holds identically (same size and MD5) is skipped; one
 *   that differs is NOT overwritten — it is reported as failed, for a person
 *   to look at.
 * - Each upload is checked afterwards (size, and MD5 where R2 gives it).
 * - One failing file does not stop the run; the summary lists every failure.
 * - Local files are never deleted here.
 *
 * Re-runnable at any time; a log of every file goes to logs/.
 */
import { config } from 'dotenv'
import { createHash } from 'crypto'
import { appendFileSync, createReadStream, mkdirSync, readdirSync, statSync } from 'fs'
import { extname, join, relative } from 'path'
import { DataSource } from 'typeorm'

import { materialType } from '../materials/upload.config'
import { r2Storage, STORED_KINDS, type StoredKind } from '../storage/r2-storage.service'
import { documentType } from '../uploads/uploads.controller'

config({ path: ['.env', '.env.local'], quiet: true })

const MEDIA_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  mp4: 'video/mp4',
  m4v: 'video/x-m4v',
  webm: 'video/webm',
  mov: 'video/quicktime',
}

/** The Content-Type a file is stored with — the same rule the upload routes use. */
function contentTypeOf(kind: StoredKind, file: string) {
  if (kind === 'documents') return documentType(extname(file).toLowerCase().slice(1))
  if (kind === 'materials') return materialType(file)
  return MEDIA_TYPES[extname(file).toLowerCase().slice(1)] ?? 'application/octet-stream'
}

const args = new Set(process.argv.slice(2))
const dryRun = args.has('--dry-run')
const verifyOnly = args.has('--verify')

mkdirSync('logs', { recursive: true })
const logFile = join('logs', `migrate-uploads-${new Date().toISOString().replace(/[:.]/g, '-')}.log`)
const log = (entry: Record<string, unknown>) => appendFileSync(logFile, JSON.stringify({ at: new Date().toISOString(), ...entry }) + '\n')

/** Every file under uploads/<kind>/, at any depth. */
function filesOf(kind: StoredKind) {
  const base = join('uploads', kind)
  const found: string[] = []
  const walk = (dir: string) => {
    let entries: string[]
    try {
      entries = readdirSync(dir)
    } catch {
      return
    }
    for (const entry of entries) {
      const path = join(dir, entry)
      const stat = statSync(path)
      if (stat.isDirectory()) walk(path)
      else if (stat.isFile() && entry !== '.gitkeep') found.push(relative(base, path).split('\\').join('/'))
    }
  }
  walk(base)
  return found.sort()
}

function md5Of(path: string) {
  return new Promise<string>((resolve, reject) => {
    const hash = createHash('md5')
    createReadStream(path)
      .on('data', (chunk) => hash.update(chunk))
      .on('end', () => resolve(hash.digest('hex')))
      .on('error', reject)
  })
}

/** R2 gives the MD5 as ETag for a single-part upload; a multipart ETag ends in -<parts>. */
const sameObject = (remote: { size: number; etag: string }, size: number, md5: string) =>
  remote.size === size && (remote.etag.includes('-') || remote.etag === md5)

const dbClient = () =>
  new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'institut',
  })

/** Every stored file some record names, read from every table (trashed rows included). */
async function referencedFiles(db: DataSource) {
  const pattern = /(images|videos|documents|materials)[\\/]([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-z0-9]+)/gi
  const tables = await db.query<Array<{ table_name: string }>>(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`)
  const found = new Map<string, { kind: StoredKind; file: string; tables: Set<string> }>()
  for (const { table_name } of tables) {
    const rows = await db.query<Array<{ row: string }>>(`SELECT t::text AS row FROM "${table_name.replace(/"/g, '""')}" t`)
    for (const { row } of rows) {
      for (const match of row.matchAll(pattern)) {
        const key = `${match[1].toLowerCase()}/${match[2]}`
        const entry = found.get(key) ?? { kind: match[1].toLowerCase() as StoredKind, file: match[2], tables: new Set<string>() }
        entry.tables.add(table_name)
        found.set(key, entry)
      }
    }
  }
  return [...found.values()]
}

async function verifyReferences() {
  const storage = r2Storage()
  const db = dbClient()
  await db.initialize()
  try {
    const references = await referencedFiles(db)
    const missing: string[] = []
    for (const reference of references) {
      const remote = await storage.head(reference.kind, reference.file)
      log({ step: 'verify', key: `${reference.kind}/${reference.file}`, bucket: storage.bucketFor(reference.kind), found: Boolean(remote) })
      if (!remote) missing.push(`${reference.kind}/${reference.file} (${[...reference.tables].join(', ')})`)
    }
    console.log(`\nRecords name ${references.length} file(s); ${references.length - missing.length} found in R2, ${missing.length} missing.`)
    for (const key of missing) console.log(`  missing: ${key}`)
    return missing.length
  } finally {
    await db.destroy()
  }
}

/** Material rows from before R2 hold a disk path; the key is materials/<file>. */
async function updateMaterialKeys() {
  const db = dbClient()
  await db.initialize()
  try {
    const rows = await db.query<Array<{ id: string; storageKey: string }>>(`SELECT id, "storageKey" FROM learning_materials WHERE "storageKey" IS NOT NULL AND "storageKey" NOT LIKE 'materials/%'`)
    for (const row of rows) {
      const key = `materials/${row.storageKey.split(/[\\/]/).pop()}`
      if (!dryRun) await db.query(`UPDATE learning_materials SET "storageKey" = $1 WHERE id = $2`, [key, row.id])
      log({ step: 'db', table: 'learning_materials', id: row.id, from: row.storageKey, to: key, dryRun })
      console.log(`  ${dryRun ? 'would update' : 'updated'} learning_materials ${row.id}: ${row.storageKey} → ${key}`)
    }
    return rows.length
  } finally {
    await db.destroy()
  }
}

async function main() {
  const storage = r2Storage()
  console.log(`Log: ${logFile}`)

  if (verifyOnly) {
    process.exit((await verifyReferences()) > 0 ? 1 : 0)
  }

  if (!dryRun) {
    for (const bucket of storage.buckets()) {
      try {
        await storage.allowBrowserReads(bucket)
        console.log(`CORS set on ${bucket} (GET/HEAD; the private bucket still needs a signed link).`)
      } catch (error) {
        console.warn(`CORS not set on ${bucket}: ${(error as Error).message} — set it in the dashboard (see README).`)
      }
    }
  }

  const summary = { total: 0, uploaded: 0, skipped: 0, failed: 0 }
  const failures: string[] = []

  for (const kind of STORED_KINDS) {
    for (const file of filesOf(kind)) {
      summary.total += 1
      const path = join('uploads', kind, file)
      const key = `${kind}/${file}`
      const type = contentTypeOf(kind, file)

      try {
        const size = statSync(path).size
        const md5 = await md5Of(path)
        const remote = await storage.head(kind, file)

        if (remote && sameObject(remote, size, md5)) {
          summary.skipped += 1
          log({ step: 'copy', key, bucket: storage.bucketFor(kind), result: 'skipped', reason: 'already in R2, identical', size })
          console.log(`  skipped   ${key} (already in R2)`)
          continue
        }

        if (remote) {
          // Same key, different content: never overwrite — a person decides.
          throw new Error(`a different object with this key is already in R2 (R2 ${remote.size} bytes, local ${size} bytes)`)
        }

        if (dryRun) {
          summary.uploaded += 1
          log({ step: 'copy', key, bucket: storage.bucketFor(kind), result: 'would upload', size, type })
          console.log(`  would upload ${key} → ${storage.bucketFor(kind)} (${type})`)
          continue
        }

        await storage.upload(kind, file, createReadStream(path), type).done
        const stored = await storage.head(kind, file)
        if (!stored || !sameObject(stored, size, md5)) {
          throw new Error(`verification failed after upload (R2 ${stored?.size ?? 'none'} bytes, local ${size} bytes)`)
        }

        summary.uploaded += 1
        log({ step: 'copy', key, bucket: storage.bucketFor(kind), result: 'uploaded', size, md5, type })
        console.log(`  uploaded  ${key} → ${storage.bucketFor(kind)}`)
      } catch (error) {
        summary.failed += 1
        failures.push(`${path}: ${(error as Error).message}`)
        log({ step: 'copy', key, result: 'failed', error: (error as Error).message })
        console.log(`  FAILED    ${key}: ${(error as Error).message}`)
      }
    }
  }

  console.log('\nDatabase references:')
  const updated = await updateMaterialKeys()
  if (updated === 0) console.log('  none to update — records already hold /uploads/<kind>/<file> paths, which are the R2 keys.')

  console.log(`\nTotal files: ${summary.total}\n${dryRun ? 'Would upload' : 'Uploaded'}: ${summary.uploaded}\nSkipped: ${summary.skipped}\nFailed: ${summary.failed}`)
  for (const failure of failures) console.log(`  failed: ${failure}`)

  if (!dryRun) {
    console.log('\nChecking that every file a record names is in R2…')
    const missing = await verifyReferences()
    process.exit(summary.failed > 0 || missing > 0 ? 1 : 0)
  }
}

void main().catch((error) => {
  console.error(`Migration stopped: ${(error as Error).message}`)
  process.exit(1)
})
