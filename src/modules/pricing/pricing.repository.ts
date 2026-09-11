import { db } from '../../db/index.js'
import { pricingConfigs, fareQuotes, surgeWindows } from '../../db/schema/index.js'
import { eq, and, isNull, desc, lte, gte } from 'drizzle-orm'
import { v4 as uuid } from 'uuid'

export const pricingRepository = {
  async findActiveConfig(city: string, category: string) {
    const now = new Date()
    return db.query.pricingConfigs.findFirst({
      where: and(
        eq(pricingConfigs.city, city),
        eq(pricingConfigs.category, category as any),
        eq(pricingConfigs.isActive, true),
        lte(pricingConfigs.effectiveFrom, now),
        isNull(pricingConfigs.effectiveTo),
      ),
      orderBy: [desc(pricingConfigs.effectiveFrom)],
    })
  },

  async findConfigById(id: string) {
    return db.query.pricingConfigs.findFirst({
      where: eq(pricingConfigs.id, id),
    })
  },

  async createConfig(data: {
    city: string
    category: string
    baseFareKobo: number
    perKmKobo: number
    perMinKobo: number
    bookingFeeKobo: number
    cancellationFeeKobo: number
    floorFuelEstimateKobo: number
    floorWearReserveKobo: number
    floorDriverTimeValueKobo: number
    platformFeePercent: number
    surgeCapMultiplier: number
    effectiveFrom: Date
    effectiveTo?: Date
  }) {
    const id = uuid()
    await db.insert(pricingConfigs).values({
      id,
      ...data,
      category: data.category as any,
    })
    return this.findConfigById(id)
  },

  async listConfigs(city?: string, category?: string) {
    const conditions = []
    if (city) conditions.push(eq(pricingConfigs.city, city))
    if (category) conditions.push(eq(pricingConfigs.category, category as any))

    return db.query.pricingConfigs.findMany({
      where: conditions.length ? and(...conditions) : undefined,
      orderBy: [desc(pricingConfigs.createdAt)],
    })
  },

  async createFareQuote(data: {
    riderId: string
    pricingConfigId: string
    pickupLat: number
    pickupLng: number
    destinationLat: number
    destinationLng: number
    distanceMeters: number
    durationSeconds: number
    estimatedFareKobo: number
    floorFareKobo: number
    surgeMultiplier: number
    expiresAt: Date
  }) {
    const id = uuid()
    await db.insert(fareQuotes).values({
      id,
      ...data,
    })
    return db.query.fareQuotes.findFirst({ where: eq(fareQuotes.id, id) })
  },

  async findValidQuote(quoteId: string) {
    const now = new Date()
    return db.query.fareQuotes.findFirst({
      where: and(
        eq(fareQuotes.id, quoteId),
        gte(fareQuotes.expiresAt, now),
        isNull(fareQuotes.usedAt),
      ),
    })
  },

  async markQuoteUsed(quoteId: string) {
    await db
      .update(fareQuotes)
      .set({ usedAt: new Date() })
      .where(eq(fareQuotes.id, quoteId))
  },

  async createSurgeWindow(data: {
    city: string
    category: string
    multiplier: number
    reason: string
    startsAt: Date
    endsAt: Date
    createdBy: string
  }) {
    const id = uuid()
    await db.insert(surgeWindows).values({
      id,
      ...data,
      category: data.category as any,
    })
    return db.query.surgeWindows.findFirst({ where: eq(surgeWindows.id, id) })
  },

  async getActiveSurge(city: string, category: string) {
    const now = new Date()
    return db.query.surgeWindows.findFirst({
      where: and(
        eq(surgeWindows.city, city),
        eq(surgeWindows.category, category as any),
        lte(surgeWindows.startsAt, now),
        gte(surgeWindows.endsAt, now),
      ),
      orderBy: [desc(surgeWindows.multiplier)],
    })
  },
}