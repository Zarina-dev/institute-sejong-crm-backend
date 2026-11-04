import { join } from 'path'
import type { DataSourceOptions } from 'typeorm'

/**
 * One connection string, as Railway hands it out (`${{Postgres.DATABASE_URL}}`).
 * Unset, it is the local database `npm run db` starts.
 */
export const databaseUrl = () => process.env.DATABASE_URL?.trim() || 'postgres://postgres:postgres@localhost:5432/institut'

/**
 * How the API and the TypeORM CLI reach PostgreSQL — one definition for
 * both, so a migration is generated and run against the schema the app
 * actually uses.
 *
 * The schema comes from migrations (src/database/migrations), run on start.
 * `synchronize` is off: it altered tables silently, could drop a column
 * with its data, had no rollback, and missed some changes altogether (a
 * partial index's WHERE). To change the schema: edit the entity, then
 * `npm run build && npm run migration:generate -- src/database/migrations/<Name>`,
 * read the generated SQL, and commit it with the entity.
 */
export function databaseOptions(): DataSourceOptions {
  return {
    type: 'postgres',
    url: databaseUrl(),
    synchronize: false,
    migrations: [join(__dirname, 'migrations', '*.{js,ts}')],
    migrationsTableName: 'migrations',
    // Each migration in its own transaction: one that fails leaves the
    // ones before it applied and itself rolled back.
    migrationsTransactionMode: 'each',
    logging: ['error'],
    // node-postgres' pool, which TypeORM hands these to.
    poolSize: Number(process.env.DB_POOL_SIZE) || 10,
    // Without these, a database that does not answer — or a pool with every
    // connection busy — leaves a request waiting forever. A bounded wait
    // answers 500 and frees the request instead.
    connectTimeoutMS: 10_000,
    extra: {
      // Idle connections are closed before a proxy or the database drops them silently.
      idleTimeoutMillis: 30_000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10_000,
    },
  }
}
