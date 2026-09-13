/**
 * Apply one of the hand-written SQL files in drizzle/manual/ to DATABASE_URL.
 *
 *   npx tsx scripts/apply-manual-sql.ts drizzle/manual/2026-09-13_auth_hardening.sql
 *
 * Statements are run in order inside a single transaction. Use this for
 * incremental changes on a database that predates the drizzle baseline.
 */
import { readFileSync } from 'node:fs'
import { pool } from '../src/db/index.js'

const file = process.argv[2]
if (!file) {
  console.error('usage: apply-manual-sql <path/to/file.sql>')
  process.exit(2)
}

// Strip `--` comments *before* splitting, so a semicolon inside a comment doesn't end a statement.
const statements = readFileSync(file, 'utf8')
  .replace(/--[^\n]*/g, '')
  .split(';')
  .map((s) => s.trim())
  .filter(Boolean)

const client = await pool.connect()
try {
  await client.query('BEGIN')
  for (const stmt of statements) {
    await client.query(stmt)
    console.log('applied:', stmt.replace(/\s+/g, ' ').slice(0, 80))
  }
  await client.query('COMMIT')
  console.log(`✓ ${statements.length} statement(s) committed`)
} catch (err) {
  await client.query('ROLLBACK')
  console.error('✗ rolled back:', err)
  process.exit(1)
} finally {
  client.release()
  await pool.end()
}
