/**
 * Seed baseline data so the platform is exercisable end-to-end:
 *   - Lagos pricing configs for every vehicle category (so /pricing/quote returns a fare)
 *   - one approved, online demo driver + vehicle (so the dashboard/admin has real rows)
 *
 *   npx tsx scripts/seed.ts
 *
 * Idempotent: re-running replaces the Lagos pricing configs and re-uses the demo
 * driver (matched by phone) instead of creating duplicates.
 */
import { v4 as uuid } from 'uuid'
import { and, eq } from 'drizzle-orm'
import { db } from '../src/db/index.js'
import { pricingConfigs, users, drivers, vehicles, riders, trips } from '../src/db/schema/index.js'

const CITY = 'Lagos'

// Fare parameters per category, all money in kobo (₦1 = 100 kobo).
const PRICING = [
  { category: 'economy', baseFareKobo: 20_000, perKmKobo: 12_000, perMinKobo: 800, bookingFeeKobo: 5_000, cancellationFeeKobo: 10_000, floorFuelEstimateKobo: 15_000, floorWearReserveKobo: 5_000, floorDriverTimeValueKobo: 10_000, platformFeePercent: 0.10, surgeCapMultiplier: 3.0 },
  { category: 'comfort', baseFareKobo: 30_000, perKmKobo: 16_000, perMinKobo: 1_100, bookingFeeKobo: 6_000, cancellationFeeKobo: 12_000, floorFuelEstimateKobo: 18_000, floorWearReserveKobo: 7_000, floorDriverTimeValueKobo: 13_000, platformFeePercent: 0.12, surgeCapMultiplier: 3.0 },
  { category: 'premium', baseFareKobo: 50_000, perKmKobo: 24_000, perMinKobo: 1_600, bookingFeeKobo: 8_000, cancellationFeeKobo: 15_000, floorFuelEstimateKobo: 22_000, floorWearReserveKobo: 10_000, floorDriverTimeValueKobo: 18_000, platformFeePercent: 0.15, surgeCapMultiplier: 3.5 },
  { category: 'xl', baseFareKobo: 45_000, perKmKobo: 22_000, perMinKobo: 1_500, bookingFeeKobo: 8_000, cancellationFeeKobo: 15_000, floorFuelEstimateKobo: 25_000, floorWearReserveKobo: 9_000, floorDriverTimeValueKobo: 16_000, platformFeePercent: 0.13, surgeCapMultiplier: 3.0 },
] as const

async function seedPricing() {
  // Upsert per (city, category) — don't delete, since fare_quotes may already
  // reference existing configs via FK.
  const effectiveFrom = new Date(Date.now() - 60_000) // 1 min in the past so it's active now
  for (const p of PRICING) {
    const fields = {
      baseFareKobo: p.baseFareKobo,
      perKmKobo: p.perKmKobo,
      perMinKobo: p.perMinKobo,
      bookingFeeKobo: p.bookingFeeKobo,
      cancellationFeeKobo: p.cancellationFeeKobo,
      floorFuelEstimateKobo: p.floorFuelEstimateKobo,
      floorWearReserveKobo: p.floorWearReserveKobo,
      floorDriverTimeValueKobo: p.floorDriverTimeValueKobo,
      platformFeePercent: p.platformFeePercent,
      surgeCapMultiplier: p.surgeCapMultiplier,
      isActive: true,
    }
    const existing = await db.query.pricingConfigs.findFirst({
      where: and(eq(pricingConfigs.city, CITY), eq(pricingConfigs.category, p.category)),
    })
    if (existing) {
      await db.update(pricingConfigs).set(fields).where(eq(pricingConfigs.id, existing.id))
    } else {
      await db.insert(pricingConfigs).values({ id: uuid(), city: CITY, category: p.category, effectiveFrom, effectiveTo: null, ...fields })
    }
  }
  console.log(`Seeded ${PRICING.length} pricing configs for ${CITY}`)
}

async function seedDriver() {
  const phone = '+2348090000001'
  let user = await db.query.users.findFirst({ where: eq(users.phone, phone) })
  if (!user) {
    const id = uuid()
    await db.insert(users).values({ id, phone, name: 'Emeka Okafor', role: 'driver' })
    user = await db.query.users.findFirst({ where: eq(users.id, id) })
  }
  if (!user) throw new Error('failed to create demo user')

  let driver = await db.query.drivers.findFirst({ where: eq(drivers.userId, user.id) })
  if (!driver) {
    const id = uuid()
    await db.insert(drivers).values({
      id,
      userId: user.id,
      status: 'approved',
      isOnline: true,
      rating: 4.9,
      totalTrips: '42',
      currentLat: 6.5244,
      currentLng: 3.3792,
      locationUpdatedAt: new Date(),
    })
    driver = await db.query.drivers.findFirst({ where: eq(drivers.id, id) })
  } else {
    await db.update(drivers)
      .set({ status: 'approved', isOnline: true, currentLat: 6.5244, currentLng: 3.3792, locationUpdatedAt: new Date(), updatedAt: new Date() })
      .where(eq(drivers.id, driver.id))
  }
  if (!driver) throw new Error('failed to create demo driver')

  const plate = 'LAG-123-XA'
  let vehicle = await db.query.vehicles.findFirst({ where: eq(vehicles.plate, plate) })
  if (!vehicle) {
    const id = uuid()
    await db.insert(vehicles).values({
      id,
      driverId: driver.id,
      plate,
      make: 'Toyota',
      model: 'Corolla',
      year: 2019,
      color: 'Silver',
      category: 'economy',
      seats: 4,
      isActive: true,
    })
    vehicle = await db.query.vehicles.findFirst({ where: eq(vehicles.id, id) })
  }
  console.log(`Seeded approved online driver ${user.name} (${phone}) + vehicle ${plate}`)
  return { driverId: driver.id, vehicleId: vehicle!.id, driverName: user.name }
}

async function seedRiderAndTrip(driverId: string, vehicleId: string) {
  const phone = '+2348090000002'
  let user = await db.query.users.findFirst({ where: eq(users.phone, phone) })
  if (!user) {
    const id = uuid()
    await db.insert(users).values({ id, phone, name: 'Tunde Adeyemi', role: 'rider' })
    user = await db.query.users.findFirst({ where: eq(users.id, id) })
  }
  if (!user) throw new Error('failed to create demo rider user')

  let rider = await db.query.riders.findFirst({ where: eq(riders.userId, user.id) })
  if (!rider) {
    const id = uuid()
    await db.insert(riders).values({ id, userId: user.id, totalTrips: '1' })
    rider = await db.query.riders.findFirst({ where: eq(riders.id, id) })
  }
  if (!rider) throw new Error('failed to create demo rider')

  // One completed trip earlier today so the Trips list and today's revenue have data.
  // Idempotent by a fixed id.
  const tripId = '11111111-1111-4111-8111-111111111111'
  const existing = await db.query.trips.findFirst({ where: eq(trips.id, tripId) })
  if (!existing) {
    const now = new Date()
    const startedAt = new Date(now.getTime() - 30 * 60_000)
    await db.insert(trips).values({
      id: tripId,
      riderId: rider.id,
      driverId,
      vehicleId,
      status: 'completed',
      mode: 'immediate',
      pickupAddress: '24 Adetokunbo Ademola St, Victoria Island',
      pickupLat: 6.5244,
      pickupLng: 3.3792,
      destinationAddress: 'Ikeja City Mall, Alausa',
      destinationLat: 6.4531,
      destinationLng: 3.3958,
      estimatedFareKobo: 179028,
      finalFareKobo: 179028,
      platformFeeKobo: 17903,
      driverAmountKobo: 161125,
      surgeMultiplier: 1.0,
      paymentMethod: 'card',
      distanceMeters: 12069,
      durationSeconds: 690,
      matchedAt: startedAt,
      startedAt,
      completedAt: now,
    })
  }
  console.log(`Seeded completed trip ${tripId} (rider ${user.name})`)
}

await seedPricing()
const { driverId, vehicleId } = await seedDriver()
await seedRiderAndTrip(driverId, vehicleId)
console.log('Seed complete.')
process.exit(0)
