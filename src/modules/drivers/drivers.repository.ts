import { db } from '../../db/index.js'
import { drivers, driverDocuments, driverStatusHistory } from '../../db/schema/index.js'
import { eq, and, isNull, desc } from 'drizzle-orm'
import { v4 as uuid } from 'uuid'

export const driversRepository = {
  async findByUserId(userId: string) {
    return db.query.drivers.findFirst({
      where: and(eq(drivers.userId, userId), isNull(drivers.deletedAt)),
    })
  },

  async findById(id: string) {
    return db.query.drivers.findFirst({
      where: and(eq(drivers.id, id), isNull(drivers.deletedAt)),
    })
  },

  async create(userId: string) {
    const id = uuid()
    await db.insert(drivers).values({ id, userId })
    return this.findById(id)
  },

  async update(id: string, data: Partial<{
    rating: number
    totalTrips: string
    currentLat: number
    currentLng: number
    subscriptionPlanId: string
    isOnline: boolean
    status: 'pending' | 'under_review' | 'approved' | 'suspended' | 'rejected' | 'expired'
  }>) {
    await db
      .update(drivers)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(drivers.id, id), isNull(drivers.deletedAt)))
    return this.findById(id)
  },

  async updateStatus(id: string, status: string, reason?: string, actorId?: string) {
    const driver = await this.findById(id)
    if (!driver) throw new Error('Driver not found')

    const fromStatus = driver.status
    await db
      .update(drivers)
      .set({ status: status as any, updatedAt: new Date() })
      .where(eq(drivers.id, id))

    await db.insert(driverStatusHistory).values({
      id: uuid(),
      driverId: id,
      fromStatus,
      toStatus: status as any,
      reason,
      actorId,
    })

    return this.findById(id)
  },

  async softDelete(id: string) {
    await db.update(drivers).set({ deletedAt: new Date() }).where(eq(drivers.id, id))
  },

  async listAll(filters?: { status?: string; limit?: number; offset?: number }) {
    const conditions = [isNull(drivers.deletedAt)]
    if (filters?.status) conditions.push(eq(drivers.status, filters.status as any))

    return db.query.drivers.findMany({
      where: and(...conditions),
      orderBy: [desc(drivers.createdAt)],
      limit: filters?.limit ?? 50,
      offset: filters?.offset ?? 0,
    })
  },

  // Documents — no deletedAt on this table
  async listDocuments(driverId: string) {
    return db.query.driverDocuments.findMany({
      where: eq(driverDocuments.driverId, driverId),
      orderBy: [desc(driverDocuments.createdAt)],
    })
  },

  async createDocument(driverId: string, data: { type: string; fileUrl?: string; referenceNumber?: string; expiresAt?: Date }) {
    const id = uuid()
    await db.insert(driverDocuments).values({
      id,
      driverId,
      type: data.type as any,
      fileUrl: data.fileUrl,
      referenceNumber: data.referenceNumber,
      expiresAt: data.expiresAt,
    })
    return db.query.driverDocuments.findFirst({ where: eq(driverDocuments.id, id) })
  },

  async verifyDocument(id: string, driverId: string) {
    await db
      .update(driverDocuments)
      .set({ verifiedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(driverDocuments.id, id), eq(driverDocuments.driverId, driverId)))
    return db.query.driverDocuments.findFirst({ where: eq(driverDocuments.id, id) })
  },

  async rejectDocument(id: string, driverId: string, reason: string) {
    await db
      .update(driverDocuments)
      .set({ rejectedAt: new Date(), rejectionReason: reason, updatedAt: new Date() })
      .where(and(eq(driverDocuments.id, id), eq(driverDocuments.driverId, driverId)))
    return db.query.driverDocuments.findFirst({ where: eq(driverDocuments.id, id) })
  },

  async getStatusHistory(driverId: string) {
    return db.query.driverStatusHistory.findMany({
      where: eq(driverStatusHistory.driverId, driverId),
      orderBy: [desc(driverStatusHistory.createdAt)],
    })
  },
}