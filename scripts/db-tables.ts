/** List user tables in the target database — a quick sanity check before/after migrating. */
import { pool } from '../src/db/index.js'
const r = await pool.query(`select table_schema, table_name from information_schema.tables where table_schema not in ('pg_catalog','information_schema') order by 1,2`)
console.log(r.rows.length ? r.rows.map((x) => `${x.table_schema}.${x.table_name}`).join('\n') : '(no user tables)')
await pool.end()
