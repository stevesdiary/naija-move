import { db } from '../../db/index.js'
import { trips, tripStops, tripEvents, tripRatings, driverOffers, dispatchAttempts, drivers, riders } from '../../db/schema/index.js'
import { eq, and, isNull, desc, inArray, sql, gte } from 'drizzle-orm'
import { v4 as uuid } from 'uuid'

const OFFER_EXPIRY_SECONDS = 20
const MAX_DISPATCH_ATTEMPTS = 3

function generatePin(): string {
  return Math.floor(1000 + Math.random() * 9000).toString()
}

export const ridesRepository = {
  // Trips
  async findById(id: string) {
    return db.query.trips.findFirst({
      where: and(eq(trips.id, id), isNull(trips.deletedAt)),
    })
  },

  async findByRiderId(riderId: string, limit = 20, offset = 0) {
    return db.query.trips.findMany({
      where: and(eq(trips.riderId, riderId), isNull(trips.deletedAt)),
      orderBy: [desc(trips.createdAt)],
      limit,
      offset,
    })
  },

  async findByDriverId(driverId: string, limit = 20, offset = 0) {
    return db.query.trips.findMany({
      where: and(eq(trips.driverId, driverId), isNull(trips.deletedAt)),
      orderBy: [desc(trips.createdAt)],
      limit,
      offset,
    })
  },

  async create(data: {
    riderId: string
    pickupAddress: string
    pickupLat: number
    pickupLng: number
    destinationAddress: string
    destinationLat: number
    destinationLng: number
    estimatedFareKobo: number
    platformFeeKobo: number
    driverAmountKobo: number
    surgeMultiplier: number
    distanceMeters: number
    durationSeconds: number
    paymentMethod: string
    quoteId?: string
    mode?: 'immediate' | 'scheduled'
    scheduledFor?: Date
  }) {
    const id = uuid()
    const pin = generatePin()
    await db.insert(trips).values({
      id,
      riderId: data.riderId,
      pickupAddress: data.pickupAddress,
      pickupLat: data.pickupLat,
      pickupLng: data.pickupLng,
      destinationAddress: data.destinationAddress,
      destinationLat: data.destinationLat,
      destinationLng: data.destinationLng,
      estimatedFareKobo: data.estimatedFareKobo,
      platformFeeKobo: data.platformFeeKobo,
      driverAmountKobo: data.driverAmountKobo,
      surgeMultiplier: data.surgeMultiplier,
      distanceMeters: data.distanceMeters,
      durationSeconds: data.durationSeconds,
      paymentMethod: data.paymentMethod as any,
      pin,
      mode: data.mode ?? 'immediate',
      scheduledFor: data.scheduledFor,
    })
    return this.findById(id)
  },

  async updateStatus(id: string, status: string, actorId?: string, actorType?: string, metadata?: Record<string, unknown>) {
    const now = new Date()
    const updates: Record<string, any> = {
      status: status as any,
      updatedAt: now,
    }

    // Set timestamp based on status
    switch (status) {
      case 'matched':
        updates.matchedAt = now
        break
      case 'driver_arrived':
        updates.driverArrivedAt = now
        break
      case 'in_progress':
        updates.startedAt = now
        break
      case 'completed':
        updates.completedAt = now
        break
      case 'cancelled':
        updates.cancelledAt = now
        break
    }

    await db.update(trips).set(updates).where(eq(trips.id, id))

    // Log event
    await this.logEvent(id, status, actorId, actorType, metadata)

    return this.findById(id)
  },

  async updateTrip(id: string, data: Partial<{
    driverId: string
    vehicleId: string
    finalFareKobo: number
    tipKobo: number
    distanceMeters: number
    durationSeconds: number
    polyline: string
    cancellationReason: string
    cancelledBy: string
    paymentMethod: 'card' | 'wallet' | 'cash' | 'bank_transfer' | 'corporate_wallet'
    paymentIntentId: string
  }>) {
    await db.update(trips).set({ ...data, updatedAt: new Date() }).where(eq(trips.id, id))
    return this.findById(id)
  },

  async verifyPin(id: string, pin: string) {
    const trip = await this.findById(id)
    if (!trip) return false
    return trip.pin === pin && !trip.pinVerified
  },

  async markPinVerified(id: string) {
    await db.update(trips).set({ pinVerified: true, updatedAt: new Date() }).where(eq(trips.id, id))
    return this.findById(id)
  },

  async logEvent(tripId: string, event: string, actorId?: string, actorType?: string, metadata?: Record<string, unknown>) {
    await db.insert(tripEvents).values({
      id: uuid(),
      tripId,
      event,
      actorId,
      actorType,
      metadata: metadata ? JSON.stringify(metadata) : null,
    })
  },

  async getEvents(tripId: string) {
    return db.query.tripEvents.findMany({
      where: eq(tripEvents.tripId, tripId),
      orderBy: [desc(tripEvents.createdAt)],
    })
  },

  // Trip Stops
  async addStop(tripId: string, sequence: number, address: string, lat: number, lng: number) {
    const id = uuid()
    await db.insert(tripStops).values({ id, tripId, sequence, address, lat, lng })
    return db.query.tripStops.findFirst({ where: eq(tripStops.id, id) })
  },

  async getStops(tripId: string) {
    return db.query.tripStops.findMany({
      where: eq(tripStops.tripId, tripId),
      orderBy: (tripStops, { asc }) => [asc(tripStops.sequence)],
    })
  },

  async updateStopArrival(stopId: string) {
    await db.update(tripStops).set({ arrivedAt: new Date() }).where(eq(tripStops.id, stopId))
    return db.query.tripStops.findFirst({ where: eq(tripStops.id, stopId) })
  },

  // Dispatch - Driver Offers
  async createOffer(data: {
    tripId: string
    driverId: string
    estimatedPickupSeconds: number
    driverLat: number
    driverLng: number
  }) {
    const id = uuid()
    const expiresAt = new Date(Date.now() + OFFER_EXPIRY_SECONDS * 1000)
    await db.insert(driverOffers).values({
      id,
      tripId: data.tripId,
      driverId: data.driverId,
      estimatedPickupSeconds: data.estimatedPickupSeconds,
      driverLatAtOffer: data.driverLat,
      driverLngAtOffer: data.driverLng,
      expiresAt,
    })
    return db.query.driverOffers.findFirst({ where: eq(driverOffers.id, id) })
  },

  async getOffer(offerId: string) {
    return db.query.driverOffers.findFirst({ where: eq(driverOffers.id, offerId) })
  },

  async getPendingOffersForTrip(tripId: string) {
    const now = new Date()
    return db.query.driverOffers.findMany({
      where: and(
        eq(driverOffers.tripId, tripId),
        eq(driverOffers.status, 'pending'),
        gte(driverOffers.expiresAt, now),
      ),
    })
  },

  async getOffersForDriver(driverId: string) {
    const now = new Date()
    return db.query.driverOffers.findMany({
      where: and(
        eq(driverOffers.driverId, driverId),
        eq(driverOffers.status, 'pending'),
        gte(driverOffers.expiresAt, now),
      ),
      orderBy: [desc(driverOffers.createdAt)],
    })
  },

  async respondToOffer(offerId: string, driverId: string, accepted: boolean, declineReason?: string) {
    const offer = await this.getOffer(offerId)
    if (!offer || offer.driverId !== driverId) throw new Error('Offer not found')
    if (offer.status !== 'pending') throw new Error('Offer already responded to')

    const now = new Date()
    if (now > offer.expiresAt) {
      await db.update(driverOffers).set({ status: 'expired', respondedAt: now }).where(eq(driverOffers.id, offerId))
      throw new Error('Offer expired')
    }

    await db.update(driverOffers).set({
      status: accepted ? 'accepted' : 'declined',
      declineReason: accepted ? null : declineReason,
      respondedAt: now,
    }).where(eq(driverOffers.id, offerId))

    return db.query.driverOffers.findFirst({ where: eq(driverOffers.id, offerId) })
  },

  async expireOffersForTrip(tripId: string) {
    await db
      .update(driverOffers)
      .set({ status: 'expired', respondedAt: new Date() })
      .where(and(eq(driverOffers.tripId, tripId), eq(driverOffers.status, 'pending')))
  },

  async recordDispatchAttempt(data: { tripId: string; attemptNumber: number; driversContacted: number; outcome: string }) {
    const id = uuid()
    await db.insert(dispatchAttempts).values({ id, ...data })
    return db.query.dispatchAttempts.findFirst({ where: eq(dispatchAttempts.id, id) })
  },

  async getDispatchAttempts(tripId: string) {
    return db.query.dispatchAttempts.findMany({
      where: eq(dispatchAttempts.tripId, tripId),
      orderBy: (dispatchAttempts, { asc }) => [asc(dispatchAttempts.attemptNumber)],
    })
  },

  async getDispatchAttemptCount(tripId: string) {
    const attempts = await db.query.dispatchAttempts.findMany({
      where: eq(dispatchAttempts.tripId, tripId),
    })
    return attempts.length
  },

  // Find nearby available drivers
  async findNearbyDrivers(lat: number, lng: number, radiusKm = 5, limit = 10) {
    // Using simple bounding box for now - in production use PostGIS
    const latDelta = radiusKm / 111
    const lngDelta = radiusKm / (111 * Math.cos(lat * Math.PI / 180))

    const nearbyDrivers = await db.query.drivers.findMany({
      where: and(
        eq(drivers.status, 'approved'),
        eq(drivers.isOnline, true),
        isNull(drivers.deletedAt),
        sql`${drivers.currentLat} BETWEEN ${lat - latDelta} AND ${lat + latDelta}`,
        sql`${drivers.currentLng} BETWEEN ${lng - lngDelta} AND ${lng + lngDelta}`,
      ),
      limit,
    })

    return nearbyDrivers.map(d => ({
      ...d,
      distanceMeters: this.calculateDistance(lat, lng, d.currentLat!, d.currentLng!) * 1000,
    })).sort((a, b) => a.distanceMeters - b.distanceMeters)
  },

  calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371 // km
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  },

  // Trip Ratings
  async createRating(tripId: string, data: { riderRating?: number; driverRating?: number; riderComment?: string; driverComment?: string }) {
    const id = uuid()
    await db.insert(tripRatings).values({ id, tripId, ...data })
    return db.query.tripRatings.findFirst({ where: eq(tripRatings.id, id) })
  },

  async getRating(tripId: string) {
    return db.query.tripRatings.findFirst({ where: eq(tripRatings.tripId, tripId) })
  },
}