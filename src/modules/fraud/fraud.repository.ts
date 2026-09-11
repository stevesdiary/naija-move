import { db } from '../../db/index.js'
import { fraudSignals, fraudReviews } from '../../db/schema/fraud.js'
import { eq, and, desc, sql } from 'drizzle-orm'
import { v4 as uuid } from 'uuid'

export const fraudRepository = {
  // Fraud Signals
  async createSignal(data: {
    entityId: string
    entityType: string
    signalType: string
    confidence?: number | null
    metadata?: string | null
    tripId?: string | null
    requiresReview?: boolean
  }) {
    const id = uuid()
    await db.insert(fraudSignals).values({ id, ...data } as any)
    return this.findSignalById(id)
  },

  async findSignalById(id: string) {
    return db.query.fraudSignals.findFirst({ where: eq(fraudSignals.id, id) })
  },

  async listSignals({ entityId, entityType, signalType, requiresReview, limit = 20, offset = 0 }: {
    entityId?: string
    entityType?: string
    signalType?: string
    requiresReview?: boolean
    limit?: number
    offset?: number
  } = {}) {
    const conditions = []
    if (entityId) conditions.push(eq(fraudSignals.entityId, entityId))
    if (entityType) conditions.push(eq(fraudSignals.entityType, entityType))
    if (signalType) conditions.push(eq(fraudSignals.signalType, signalType as any))
    if (requiresReview !== undefined) conditions.push(eq(fraudSignals.requiresReview, requiresReview))

    return db.query.fraudSignals.findMany({
      where: conditions.length ? and(...conditions) : undefined,
      orderBy: [desc(fraudSignals.createdAt)],
      limit,
      offset,
    })
  },

  async updateSignal(id: string, data: {
    entityId?: string
    entityType?: string
    signalType?: string
    confidence?: number | null
    metadata?: string | null
    tripId?: string | null
    requiresReview?: boolean
  }) {
    await db.update(fraudSignals).set(data as any).where(eq(fraudSignals.id, id))
    return this.findSignalById(id)
  },

  // Fraud Reviews
  async createReview(data: {
    fraudSignalId: string
    reviewedBy?: string | null
    status: string
    note?: string | null
    actionTaken?: string | null
  }) {
    const id = uuid()
    await db.insert(fraudReviews).values({ id, ...data } as any)
    return this.findReviewById(id)
  },

  async findReviewById(id: string) {
    return db.query.fraudReviews.findFirst({ where: eq(fraudReviews.id, id) })
  },

  async findReviewBySignalId(signalId: string) {
    return db.query.fraudReviews.findFirst({ where: eq(fraudReviews.fraudSignalId, signalId) })
  },

  async listReviews({ status, limit = 20, offset = 0 }: { status?: string; limit?: number; offset?: number } = {}) {
    const conditions = status ? [eq(fraudReviews.status, status as any)] : []
    return db.query.fraudReviews.findMany({
      where: conditions.length ? and(...conditions) : undefined,
      orderBy: [desc(fraudReviews.createdAt)],
      limit,
      offset,
    })
  },

  async updateReview(id: string, data: {
    fraudSignalId?: string
    reviewedBy?: string | null
    status?: string
    note?: string | null
    actionTaken?: string | null
  }) {
    await db.update(fraudReviews).set({ ...data, updatedAt: new Date() } as any).where(eq(fraudReviews.id, id))
    return this.findReviewById(id)
  },

  // Stats
  async getSignalStats() {
    const [total] = await db.select({ count: sql<number>`count(*)` }).from(fraudSignals)
    const [pendingReview] = await db
      .select({ count: sql<number>`count(*)` })
      .from(fraudSignals)
      .where(eq(fraudSignals.requiresReview, true))

    const byType = await db
      .select({ signalType: fraudSignals.signalType, count: sql<number>`count(*)` })
      .from(fraudSignals)
      .groupBy(fraudSignals.signalType)

    return { total: total?.count ?? 0, pendingReview: pendingReview?.count ?? 0, byType }
  },
}