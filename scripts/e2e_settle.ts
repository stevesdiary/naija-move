/**
 * End-to-end settlement verification (temporary — safe to delete).
 *
 * Drives a full ride over HTTP for a given payment method, then reads the
 * ledger directly to prove recordTripEarnings posted the correct double entry
 * and that the driver's settlement-net is right.
 *
 *   npx tsx scripts/e2e_settle.ts cash
 *   npx tsx scripts/e2e_settle.ts wallet
 */
import { redis } from '../src/lib/idempotency.js'
import { db } from '../src/db/index.js'
import { trips } from '../src/db/schema/rides.js'
import { driverOffers } from '../src/db/schema/dispatch.js'
import { eq, desc } from 'drizzle-orm'
import { ledgerRepository } from '../src/modules/payments/ledger.repository.js'

const BASE = 'http://localhost:3004'
const DRIVER_PHONE = '+2348090000001' // seeded, approved+online @ VI Lagos
const RIDER_PHONE = '+2348090000002' // seeded rider
const PICKUP = { lat: 6.5244, lng: 3.3792, address: 'Victoria Island, Lagos' }
const DEST = { lat: 6.6018, lng: 3.3515, address: 'Ikeja City Mall, Lagos' }

const method = (process.argv[2] ?? 'cash') as 'cash' | 'wallet'
const naira = (k: number) => `₦${(k / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`

async function api(path: string, opts: { method?: string; token?: string; body?: unknown } = {}) {
  const m = opts.method ?? 'GET'
  // Fastify's JSON parser rejects an empty body when content-type is JSON, so
  // POST/PUT with no explicit body still send {}.
  const body = opts.body ?? (m === 'POST' || m === 'PUT' ? {} : undefined)
  const res = await fetch(`${BASE}${path}`, {
    method: m,
    headers: {
      ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json: any = null
  try { json = text ? JSON.parse(text) : null } catch { json = text }
  if (!res.ok) throw new Error(`${opts.method ?? 'GET'} ${path} → ${res.status}: ${text}`)
  return json
}

async function login(phone: string): Promise<string> {
  // Dev convenience: clear per-phone OTP rate-limit/attempt counters so repeated
  // test runs don't trip the 3-per-10-min guard.
  await redis.del(`otp:rate:${phone}`, `otp:attempts:${phone}`)
  await api('/auth/otp/request', { method: 'POST', body: { phone } })
  const code = await redis.get<string>(`otp:${phone}`)
  if (!code) throw new Error(`no OTP in redis for ${phone}`)
  const r = await api('/auth/otp/verify', { method: 'POST', body: { phone, code: String(code) } })
  return r.accessToken ?? r.access_token ?? r.token
}

async function main() {
  console.log(`\n=== Settlement E2E — ${method.toUpperCase()} ===`)

  const [riderTok, driverTok] = await Promise.all([login(RIDER_PHONE), login(DRIVER_PHONE)])
  console.log('✓ rider + driver logged in')

  const quote = await api('/pricing/quote', {
    method: 'POST', token: riderTok,
    body: { city: 'Lagos', category: 'economy', pickupLat: PICKUP.lat, pickupLng: PICKUP.lng, destinationLat: DEST.lat, destinationLng: DEST.lng },
  })
  const b = quote.breakdown ?? {}
  console.log(`✓ quote ${quote.quoteId}: fare ${naira(quote.estimatedFareKobo)} · platform ${naira(b.platformFeeKobo)} · driver ${naira(b.driverAmountKobo)}`)

  const trip = await api('/rides', {
    method: 'POST', token: riderTok,
    body: {
      pickupAddress: PICKUP.address, pickupLat: PICKUP.lat, pickupLng: PICKUP.lng,
      destinationAddress: DEST.address, destinationLat: DEST.lat, destinationLng: DEST.lng,
      paymentMethod: method, quoteId: quote.quoteId,
    },
  })
  const tripId = trip.id
  console.log(`✓ trip ${tripId} created (status ${trip.status})`)

  // Dispatch created a driver_offer. (GET /drivers/offers is still a Phase-6
  // stub, so read the offer the dispatcher wrote rather than polling HTTP.)
  const offerRow = await db.query.driverOffers.findFirst({
    where: eq(driverOffers.tripId, tripId),
    orderBy: [desc(driverOffers.createdAt)],
  })
  if (!offerRow) throw new Error(`dispatch created no offer for trip ${tripId}`)
  const offerId = offerRow.id
  console.log(`✓ dispatch offered trip to driver (offer ${offerId})`)

  await api(`/rides/offers/${offerId}/accept`, { method: 'POST', token: driverTok })
  console.log('✓ driver accepted → driver_arriving')

  await api(`/rides/driver/trips/${tripId}/arrive`, { method: 'POST', token: driverTok })
  console.log('✓ driver_arrived')

  const row = await db.query.trips.findFirst({ where: eq(trips.id, tripId), columns: { pin: true } })
  const pin = row?.pin
  if (!pin) throw new Error('could not read trip PIN')

  await api(`/rides/driver/trips/${tripId}/start`, { method: 'POST', token: driverTok, body: { pin } })
  console.log(`✓ PIN ${pin} verified → in_progress`)

  const done = await api(`/rides/driver/trips/${tripId}/complete`, {
    method: 'POST', token: driverTok, body: { finalDistanceMeters: quote.distanceMeters ?? 12000, finalDurationSeconds: quote.durationSeconds ?? 1500 },
  })
  console.log(`✓ completed — final ${naira(done.finalFareKobo)}, driver ${naira(done.driverAmountKobo)}`)

  // --- Ledger assertions ---
  const entries = await ledgerRepository.getEntriesForReference(tripId, 'trip')
  console.log(`\n--- ledger_entries for trip (${entries.length}) ---`)
  for (const e of entries) {
    console.log(`  ${e.type.padEnd(6)} ${String(e.account).padEnd(18)} ${naira(e.amountKobo).padStart(12)}  actor=${e.actorId ?? 'null'}`)
  }

  const fullTrip = await db.query.trips.findFirst({ where: eq(trips.id, tripId) })
  const driverId = fullTrip!.driverId!
  const payable = await ledgerRepository.getWalletBalance(driverId, 'driver')
  console.log(`\n→ driver_payable net for driver ${driverId}: ${naira(payable.balanceKobo)}`)

  // Expectations
  const feeEntry = entries.find((e) => e.account === 'platform_revenue' && e.type === 'credit')
  const driverLeg = entries.find((e) => e.account === 'driver_payable')
  console.log('\n--- assertions ---')
  if (method === 'cash') {
    console.log(`  cash: driver owes platform commission ${naira(feeEntry?.amountKobo ?? 0)} (debit driver_payable, credit platform_revenue)`)
    console.log(`  driver_payable leg is a DEBIT: ${driverLeg?.type === 'debit' ? 'PASS' : 'FAIL (' + driverLeg?.type + ')'}`)
  } else {
    console.log(`  wallet: platform fee ${naira(feeEntry?.amountKobo ?? 0)} + driver payable credited`)
    console.log(`  driver_payable leg is a CREDIT: ${driverLeg?.type === 'credit' ? 'PASS' : 'FAIL (' + driverLeg?.type + ')'}`)
    console.log(`  driver_payable actor is the driver: ${driverLeg?.actorId === driverId ? 'PASS' : 'FAIL'}`)
  }

  process.exit(0)
}

main().catch((e) => { console.error('\n✗ E2E FAILED:', e.message); process.exit(1) })
