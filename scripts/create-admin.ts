/**
 * Bootstrap or rotate an admin account.
 *
 *   npx tsx scripts/create-admin.ts --email ops@naijamove.com --phone +2348000000000 --name "Ops Lead"
 *
 * The password is read from ADMIN_PASSWORD or prompted for — never pass it as
 * an argv flag (it would land in shell history and `ps`).
 */
import { createInterface } from 'node:readline/promises'
import { stdin, stdout } from 'node:process'
import { v4 as uuid } from 'uuid'
import { eq } from 'drizzle-orm'
import { db } from '../src/db/index.js'
import { users } from '../src/db/schema/index.js'
import { hashPassword } from '../src/lib/password.js'

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  return i === -1 ? undefined : process.argv[i + 1]
}

const email = arg('email')?.toLowerCase()
const phone = arg('phone')
const name = arg('name') ?? 'Admin'
if (!email || !phone) {
  console.error('usage: create-admin --email <email> --phone <+234...> [--name <name>]')
  process.exit(2)
}

let password = process.env.ADMIN_PASSWORD
if (!password) {
  const rl = createInterface({ input: stdin, output: stdout })
  password = await rl.question('Password (min 12 chars): ')
  rl.close()
}
if (!password || password.length < 12) {
  console.error('Password must be at least 12 characters')
  process.exit(2)
}

const passwordHash = await hashPassword(password)
const existing = await db.query.users.findFirst({ where: eq(users.email, email) })

if (existing) {
  await db.update(users).set({ passwordHash, role: 'admin', isActive: true, updatedAt: new Date() }).where(eq(users.id, existing.id))
  console.log(`Updated admin ${email} (${existing.id})`)
} else {
  const id = uuid()
  await db.insert(users).values({ id, email, phone, name, role: 'admin', passwordHash })
  console.log(`Created admin ${email} (${id})`)
}
process.exit(0)
