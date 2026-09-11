import { db } from '../../db/index.js'
import { complianceItems, complianceEvents } from '../../db/schema/compliance.js'
import { eq, and, desc, gte, lte, sql } from 'drizzle-orm'
import { v4 as uuid } from 'uuid'

export const complianceRepository = {
  // Compliance Items
  async createItem(data: {
    entityId: string
    entityType: string
    jurisdiction?: string
    itemType: string
    status?: string
    blocksActivation?: boolean
    expiresAt?: Date | null
    lastCheckedAt?: Date | null
  }) {
    const id = uuid()
    await db.insert(complianceItems).values({ id, ...data } as any)
    return this.findItemById(id)
  },

  async findItemById(id: string) {
    return db.query.complianceItems.findFirst({ where: eq(complianceItems.id, id) })
  },

  async listItems({ entityId, entityType, jurisdiction, status, limit = 20, offset = 0 }: {
    entityId?: string
    entityType?: string
    jurisdiction?: string
    status?: string
    limit?: number
    offset?: number
  } = {}) {
    const conditions = []
    if (entityId) conditions.push(eq(complianceItems.entityId, entityId))
    if (entityType) conditions.push(eq(complianceItems.entityType, entityType))
    if (jurisdiction) conditions.push(eq(complianceItems.jurisdiction, jurisdiction))
    if (status) conditions.push(eq(complianceItems.status, status as any))

    return db.query.complianceItems.findMany({
      where: conditions.length ? and(...conditions) : undefined,
      orderBy: [desc(complianceItems.createdAt)],
      limit,
      offset,
    })
  },

  async updateItem(id: string, data: {
    entityId?: string
    entityType?: string
    jurisdiction?: string
    itemType?: string
    status?: string
    blocksActivation?: boolean
    expiresAt?: Date | null
    lastCheckedAt?: Date | null
  }) {
    await db.update(complianceItems).set({ ...data, updatedAt: new Date() } as any).where(eq(complianceItems.id, id))
    return this.findItemById(id)
  },

  async deleteItem(id: string) {
    await db.delete(complianceItems).where(eq(complianceItems.id, id))
  },

  // Compliance Events
  async createEvent(data: {
    complianceItemId: string
    fromStatus?: string | null
    toStatus: string
    triggeredBy: string
    actorId?: string | null
    note?: string | null
  }) {
    const id = uuid()
    await db.insert(complianceEvents).values({ id, ...data } as any)
    return this.findEventById(id)
  },

  async findEventById(id: string) {
    return db.query.complianceEvents.findFirst({ where: eq(complianceEvents.id, id) })
  },

  async listEventsByItem(itemId: string, limit = 20, offset = 0) {
    return db.query.complianceEvents.findMany({
      where: eq(complianceEvents.complianceItemId, itemId),
      orderBy: [desc(complianceEvents.createdAt)],
      limit,
      offset,
    })
  },

  // Stats
  async getComplianceStats() {
    const [total] = await db.select({ count: sql<number>`count(*)` }).from(complianceItems)
    const [compliant] = await db.select({ count: sql<number>`count(*)` }).from(complianceItems).where(eq(complianceItems.status, 'compliant' as any))
    const [pending] = await db.select({ count: sql<number>`count(*)` }).from(complianceItems).where(eq(complianceItems.status, 'pending' as any))
    const [expiring] = await db.select({ count: sql<number>`count(*)` }).from(complianceItems).where(eq(complianceItems.status, 'expiring_soon' as any))
    const [expired] = await db.select({ count: sql<number>`count(*)` }).from(complianceItems).where(eq(complianceItems.status, 'expired' as any))
    const [blocked] = await db.select({ count: sql<number>`count(*)` }).from(complianceItems).where(eq(complianceItems.status, 'blocked' as any))

    const byItemType = await db
      .select({ itemType: complianceItems.itemType, count: sql<number>`count(*)` })
      .from(complianceItems)
      .groupBy(complianceItems.itemType)

    return { total: total?.count ?? 0, compliant: compliant?.count ?? 0, pending: pending?.count ?? 0, expiring: expiring?.count ?? 0, expired: expired?.count ?? 0, blocked: blocked?.count ?? 0, byItemType }
  },

  // Check expiring items
  async checkExpiringItems() {
    const soon = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    return db.query.complianceItems.findMany({
      where: and(eq(complianceItems.status, 'compliant' as any), lte(complianceItems.expiresAt, soon)),
    })
  },
}