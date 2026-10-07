import { join } from 'path'
import type { DataSourceOptions } from 'typeorm'

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
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'institut',
    synchronize: false,
    migrations: [join(__dirname, 'migrations', '*.{js,ts}')],
    migrationsTableName: 'migrations',
    // Each migration in its own transaction: one that fails leaves the
    // ones before it applied and itself rolled back.
    migrationsTransactionMode: 'each',
    logging: ['error'],
  }
}
