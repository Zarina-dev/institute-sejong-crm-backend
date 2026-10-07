/**
 * The DataSource the TypeORM CLI uses (npm run migration:*). Run against
 * the compiled code — `npm run build` first — so it sees exactly the
 * entities the API runs with. The API itself configures TypeORM in
 * app.module.ts from the same databaseOptions().
 */
import { config } from 'dotenv'
import { join } from 'path'
import { DataSource } from 'typeorm'

import { databaseOptions } from './database.options'

config({ path: ['.env', '.env.local'], quiet: true })

export default new DataSource({
  ...databaseOptions(),
  // The app registers entities per module (autoLoadEntities); the CLI has no
  // modules, so it finds them by file name.
  entities: [join(__dirname, '..', '**', '*.entity.{js,ts}')],
})
