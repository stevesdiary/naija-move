import { db } from '../../db/index.js'
import { deliveryJobs, deliveryProofs, drivers } from '../../db/schema/index.js'
import { eq, and, isNull, desc } from 'drizzle-orm'
import { v4 as uuid } from 'uuid'

export const logisticsRepository = {
  async createJob(data: {
    merchantId: string
    pickupAddress: string
    pickupLat: number
    pickupLng: number
    dropoffAddress: string
    dropoffLat: number
    dropoffLng: number
    recipientName: string
    recipientPhone: string
    parcelType: string
    parcelDescription?: string
    declaredValueKobo?: number
    priceKobo: number
    scheduledFor?: Date
  }) {
    const id = uuid()
    await db.insert(deliveryJobs).values({
      id,
      ...data,
    })
    return this.findJobById(id)
  },

  async findJobById(id: string) {
    return db.query.deliveryJobs.findFirst({
      where: eq(deliveryJobs.id, id),
    })
  },

  async findJobsByMerchant(merchantId: string, limit = 20, offset = 0) {
    return db.query.deliveryJobs.findMany({
      where: eq(deliveryJobs.merchantId, merchantId),
      orderBy: [desc(deliveryJobs.createdAt)],
      limit,
      offset,
    })
  },

  async findJobsByDriver(driverId: string, limit = 20, offset = 0) {
    return db.query.deliveryJobs.findMany({
      where: eq(deliveryJobs.driverId, driverId),
      orderBy: [desc(deliveryJobs.createdAt)],
      limit,
      offset,
    })
  },

  async updateJobStatus(id: string, status: string, driverId?: string) {
    const updates: Record<string, any> = { status: status as any, updatedAt: new Date() }
    if (status === 'picked_up') updates.pickedUpAt = new Date()
    if (status === 'delivered') updates.deliveredAt = new Date()
    if (status === 'cancelled') updates.cancelledAt = new Date()
    if (driverId) updates.driverId = driverId

    await db.update(deliveryJobs).set(updates).where(eq(deliveryJobs.id, id))
    return this.findJobById(id)
  },

  async createProof(data: {
    deliveryJobId: string
    otp?: string
    photoUrl?: string
    recipientConfirmed?: string
  }) {
    const id = uuid()
    await db.insert(deliveryProofs).values({
      id,
      ...data,
    })
    return db.query.deliveryProofs.findFirst({ where: eq(deliveryProofs.id, id) })
  },

  async verifyOtp(deliveryJobId: string, otp: string) {
    const proof = await db.query.deliveryProofs.findFirst({
      where: and(eq(deliveryProofs.deliveryJobId, deliveryJobId), eq(deliveryProofs.otp, otp)),
    })
    if (!proof) return false

    await db.update(deliveryProofs).set({ otpVerifiedAt: new Date() }).where(eq(deliveryProofs.id, proof.id))
    return true
  },
}