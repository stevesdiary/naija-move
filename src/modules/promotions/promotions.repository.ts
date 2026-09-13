import { db, type Tx } from '../../db/index.js'
import { promotions, promoRedemptions, referrals } from '../../db/schema/promotions.js'
import { eq, and, desc, gte, lte, sql, or } from 'drizzle-orm'
import { v4 as uuid } from 'uuid'

export const promotionsRepository = {
  // Promotions
  async createPromotion(data: {
    code: string
    type: string
    target: string
    valueKobo?: number
    valuePercent?: number
    maxDiscountKobo?: number
    budgetKobo: number
    maxRedemptions?: number
    maxPerUser?: number
    isActive?: boolean
    startsAt: Date
    endsAt?: Date | null
    createdBy: string
    spentKobo?: number
    redemptionCount?: number
  }) {
    const id = uuid()
    await db.insert(promotions).values({ id, ...data } as any)
    return this.findPromotionById(id)
  },

  async findPromotionById(id: string) {
    return db.query.promotions.findFirst({ where: eq(promotions.id, id) })
  },

  async findPromotionByCode(code: string) {
    return db.query.promotions.findFirst({ where: eq(promotions.code, code) })
  },

  async listPromotions({ activeOnly = true, target, limit = 20, offset = 0 }: { activeOnly?: boolean; target?: string; limit?: number; offset?: number } = {}) {
    const conditions = []
    if (activeOnly) {
      conditions.push(eq(promotions.isActive, true))
      conditions.push(lte(promotions.startsAt, new Date()))
      conditions.push(or(sql`${promotions.endsAt} IS NULL`, gte(promotions.endsAt, new Date())))
    }
    if (target) {
      conditions.push(eq(promotions.target, target as any))
    }
    return db.query.promotions.findMany({
      where: conditions.length ? and(...conditions) : undefined,
      orderBy: [desc(promotions.createdAt)],
      limit,
      offset,
    })
  },

  async updatePromotion(id: string, data: {
    code?: string
    isActive?: boolean
    budgetKobo?: number
    maxRedemptions?: number
    maxPerUser?: number
    endsAt?: Date | null
  }) {
    await db.update(promotions).set(data as any).where(eq(promotions.id, id))
    return this.findPromotionById(id)
  },

  async deletePromotion(id: string) {
    await db.delete(promotions).where(eq(promotions.id, id))
  },

  // Redemptions
  /**
   * Redeem under a row lock on the promotion so budget / total / per-user limits
   * are re-checked against committed state — concurrent requests can't all pass
   * the same pre-check. Returns null when a limit is hit.
   */
  async createRedemption(data: {
    promotionId: string
    userId: string
    tripId?: string | null
    discountKobo: number
    maxPerUser: number
  }) {
    return db.transaction(async (tx: Tx) => {
      const [promo] = await tx.select().from(promotions).where(eq(promotions.id, data.promotionId)).for('update')
      if (!promo) return null
      if (promo.spentKobo + data.discountKobo > promo.budgetKobo) return null
      if (promo.maxRedemptions && promo.redemptionCount >= promo.maxRedemptions) return null

      const [{ n }] = await tx
        .select({ n: sql<number>`count(*)` })
        .from(promoRedemptions)
        .where(and(eq(promoRedemptions.promotionId, data.promotionId), eq(promoRedemptions.userId, data.userId)))
      if (Number(n) >= data.maxPerUser) return null

      const id = uuid()
      await tx.insert(promoRedemptions).values({
        id,
        promotionId: data.promotionId,
        userId: data.userId,
        tripId: data.tripId,
        discountKobo: data.discountKobo,
      } as any)
      await tx
        .update(promotions)
        .set({ redemptionCount: sql`${promotions.redemptionCount} + 1`, spentKobo: sql`${promotions.spentKobo} + ${data.discountKobo}` } as any)
        .where(eq(promotions.id, data.promotionId))
      return tx.query.promoRedemptions.findFirst({ where: eq(promoRedemptions.id, id) })
    })
  },

  async findRedemptionById(id: string) {
    return db.query.promoRedemptions.findFirst({ where: eq(promoRedemptions.id, id) })
  },

  async listRedemptionsByUser(userId: string, limit = 20, offset = 0) {
    return db.query.promoRedemptions.findMany({
      where: eq(promoRedemptions.userId, userId),
      orderBy: [desc(promoRedemptions.createdAt)],
      limit,
      offset,
    })
  },

  async countUserRedemptions(promotionId: string, userId: string) {
    const result = await db.query.promoRedemptions.findMany({
      where: and(eq(promoRedemptions.promotionId, promotionId), eq(promoRedemptions.userId, userId)),
    })
    return result.length
  },

  // Referrals
  async createReferral(data: {
    referrerId: string
    referredId: string
    code: string
    rewardKobo?: number | null
    rewardedAt?: Date | null
  }) {
    const id = uuid()
    await db.insert(referrals).values({ id, ...data } as any)
    return this.findReferralById(id)
  },

  async findReferralById(id: string) {
    return db.query.referrals.findFirst({ where: eq(referrals.id, id) })
  },

  async findReferralByCode(code: string) {
    return db.query.referrals.findFirst({ where: eq(referrals.code, code) })
  },

  async findReferralByReferredId(referredId: string) {
    return db.query.referrals.findFirst({ where: eq(referrals.referredId, referredId) })
  },

  async listReferralsByReferrer(referrerId: string, limit = 20, offset = 0) {
    return db.query.referrals.findMany({
      where: eq(referrals.referrerId, referrerId),
      orderBy: [desc(referrals.createdAt)],
      limit,
      offset,
    })
  },

  async updateReferralReward(referralId: string, rewardKobo: number) {
    await db.update(referrals).set({ rewardKobo, rewardedAt: new Date() } as any).where(eq(referrals.id, referralId))
    return this.findReferralById(referralId)
  },
}