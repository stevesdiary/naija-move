import { db } from '../../db/index.js'
import { driverPlans, driverSubscriptions } from '../../db/schema/subscriptions.js'
import { eq, and, desc, sql } from 'drizzle-orm'
import { v4 as uuid } from 'uuid'

export const subscriptionsRepository = {
  // Plans
  async createPlan(data: {
    name: string
    description?: string | null
    platformFeePercent: number
    weeklyFeeKobo?: number
    isActive?: boolean
  }) {
    const id = uuid()
    await db.insert(driverPlans).values({ id, ...data } as any)
    return this.findPlanById(id)
  },

  async findPlanById(id: string) {
    return db.query.driverPlans.findFirst({ where: eq(driverPlans.id, id) })
  },

  async listPlans(activeOnly = true) {
    const conditions = activeOnly ? [eq(driverPlans.isActive, true)] : []
    return db.query.driverPlans.findMany({
      where: conditions.length ? and(...conditions) : undefined,
      orderBy: [desc(driverPlans.createdAt)],
    })
  },

  async updatePlan(id: string, data: {
    name?: string
    description?: string | null
    platformFeePercent?: number
    weeklyFeeKobo?: number
    isActive?: boolean
  }) {
    await db.update(driverPlans).set({ ...data, updatedAt: new Date() } as any).where(eq(driverPlans.id, id))
    return this.findPlanById(id)
  },

  async deletePlan(id: string) {
    await db.delete(driverPlans).where(eq(driverPlans.id, id))
  },

  // Subscriptions
  async createSubscription(data: {
    driverId: string
    planId: string
    status: string
    currentPeriodStart: Date
    currentPeriodEnd: Date
    cancelledAt?: Date | null
  }) {
    const id = uuid()
    await db.insert(driverSubscriptions).values({ id, ...data } as any)
    return this.findSubscriptionById(id)
  },

  async findSubscriptionById(id: string) {
    return db.query.driverSubscriptions.findFirst({ where: eq(driverSubscriptions.id, id) })
  },

  async findActiveSubscriptionByDriver(driverId: string) {
    return db.query.driverSubscriptions.findFirst({
      where: and(
        eq(driverSubscriptions.driverId, driverId),
        eq(driverSubscriptions.status, 'active' as any),
      ),
    })
  },

  async listDriverSubscriptions(driverId: string) {
    return db.query.driverSubscriptions.findMany({
      where: eq(driverSubscriptions.driverId, driverId),
      orderBy: [desc(driverSubscriptions.createdAt)],
    })
  },

  async updateSubscription(id: string, data: {
    driverId?: string
    planId?: string
    status?: string
    currentPeriodStart?: Date
    currentPeriodEnd?: Date
    cancelledAt?: Date | null
  }) {
    await db.update(driverSubscriptions).set({ ...data, updatedAt: new Date() } as any).where(eq(driverSubscriptions.id, id))
    return this.findSubscriptionById(id)
  },

  async cancelSubscription(id: string) {
    await db
      .update(driverSubscriptions)
      .set({ status: 'cancelled', cancelledAt: new Date(), updatedAt: new Date() } as any)
      .where(eq(driverSubscriptions.id, id))
    return this.findSubscriptionById(id)
  },

  async expireSubscriptions() {
    const now = new Date()
    await db
      .update(driverSubscriptions)
      .set({ status: 'expired', updatedAt: now } as any)
      .where(and(eq(driverSubscriptions.status, 'active' as any), sql`${driverSubscriptions.currentPeriodEnd} < ${now}`))
  },
}