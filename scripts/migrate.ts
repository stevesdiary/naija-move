/**
 * Apply pending drizzle migrations using the application's own pool (so the
 * pinned DATABASE_CERT TLS config applies — drizzle-kit's connection would not).
 *
 *   npm run db:migrate
 */
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { db, pool } from '../src/db/index.js'

await migrate(db, { migrationsFolder: './drizzle/migrations' })
console.log('✓ migrations applied')
await pool.end()
