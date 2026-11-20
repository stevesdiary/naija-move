/** Rider NIN KYC E2E (temporary). npx tsx scripts/e2e_kyc.ts */
import { redis } from '../src/lib/idempotency.js'
import { db } from '../src/db/index.js'
import { riders } from '../src/db/schema/riders.js'
import { users } from '../src/db/schema/identity.js'
import { eq } from 'drizzle-orm'
import { decryptField, decryptJson } from '../src/lib/field-encryption.js'

const BASE = 'http://localhost:3004'
const RIDER_PHONE = '+2348090000002'

async function api(path: string, opts: { method?: string; token?: string; body?: unknown } = {}) {
  const m = opts.method ?? 'GET'
  const body = opts.body ?? (m === 'POST' ? {} : undefined)
  const res = await fetch(`${BASE}${path}`, {
    method: m,
    headers: { ...(body !== undefined ? { 'content-type': 'application/json' } : {}), ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`${m} ${path} → ${res.status}: ${text}`)
  return text ? JSON.parse(text) : null
}

async function main() {
  console.log('\n=== Rider NIN KYC E2E ===')
  await redis.del(`otp:rate:${RIDER_PHONE}`, `otp:attempts:${RIDER_PHONE}`)
  await api('/auth/otp/request', { method: 'POST', body: { phone: RIDER_PHONE } })
  const code = await redis.get<string>(`otp:${RIDER_PHONE}`)
  const v = await api('/auth/otp/verify', { method: 'POST', body: { phone: RIDER_PHONE, code: String(code) } })
  const tok = v.accessToken ?? v.access_token ?? v.token
  console.log('✓ rider logged in')

  // Reset any prior KYC so the run is repeatable
  const u = await db.query.users.findFirst({ where: eq(users.phone, RIDER_PHONE) })
  await db.update(riders).set({ kycStatus: 'unverified', ninVerified: false, nin: null, ninData: null, kycVerifiedAt: null }).where(eq(riders.userId, u!.id))

  const before = await api('/riders/me/kyc', { token: tok })
  console.log(`✓ GET /riders/me/kyc (before): ${JSON.stringify(before)}`)

  const nin = '12345678901'
  const r = await api('/riders/me/kyc/nin', { method: 'POST', token: tok, body: { nin } })
  console.log(`✓ POST /riders/me/kyc/nin → ${JSON.stringify(r)}`)

  const after = await api('/riders/me/kyc', { token: tok })
  console.log(`✓ GET /riders/me/kyc (after): ${JSON.stringify(after)}`)

  // Prove the NIN is encrypted at rest (not the plaintext 12345678901)
  const row = await db.query.riders.findFirst({ where: eq(riders.userId, u!.id), columns: { nin: true, ninData: true, kycStatus: true } })
  const storedNin = row?.nin ?? ''
  console.log('\n--- at-rest storage ---')
  console.log(`  stored nin column: ${storedNin.slice(0, 40)}...`)
  console.log(`  is plaintext NIN?  ${storedNin.includes(nin) ? 'YES — FAIL' : 'NO — encrypted ✓'}`)
  console.log(`  decrypts back to NIN: ${decryptField(storedNin) === nin ? 'PASS' : 'FAIL'}`)
  const data = decryptJson<any>(row!.ninData!)
  console.log(`  ninData decrypts (provider=${data.provider}, verified=${data.verified})`)
  console.log(`\n→ kycStatus in DB: ${row?.kycStatus}`)
  process.exit(0)
}
main().catch((e) => { console.error('\n✗ KYC E2E FAILED:', e.message); process.exit(1) })
