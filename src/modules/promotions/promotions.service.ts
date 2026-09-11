import { promotionsRepository } from './promotions.repository.js'
import { errors } from '../../lib/errors.js'

export const promotionsService = {
  // Rider/Driver: list available promotions
  async listAvailablePromotions(userType: 'rider' | 'driver') {
    return promotionsRepository.listPromotions({ activeOnly: true, target: userType })
  },

  // Rider/Driver: redeem promotion
  async redeemPromotion(userId: string, code: string, tripId?: string) {
    const promo = await promotionsRepository.findPromotionByCode(code)
    if (!promo) throw errors.notFound('Invalid promotion code')

    // Check if promotion is active and within date range
    const now = new Date()
    if (!promo.isActive || promo.startsAt > now || (promo.endsAt && promo.endsAt < now)) {
      throw errors.unprocessable('Promotion is not currently active')
    }

    // Check budget
    if (promo.spentKobo >= promo.budgetKobo) {
      throw errors.unprocessable('Promotion budget exhausted')
    }

    // Check max redemptions
    if (promo.maxRedemptions && promo.redemptionCount >= promo.maxRedemptions) {
      throw errors.unprocessable('Promotion redemption limit reached')
    }

    // Check per-user limit
    const userRedemptions = await promotionsRepository.countUserRedemptions(promo.id, userId)
    if (userRedemptions >= promo.maxPerUser) {
      throw errors.unprocessable('You have already used this promotion the maximum number of times')
    }

    // Calculate discount
    let discountKobo = 0
    if (promo.type === 'flat_discount' && promo.valueKobo) {
      discountKobo = promo.valueKobo
    } else if (promo.type === 'percent_discount' && promo.valuePercent) {
      // Note: actual trip amount would be passed in real implementation
      // For now, we return the percentage for the caller to calculate
      discountKobo = 0 // Will be calculated by caller
    } else if (promo.type === 'free_ride') {
      discountKobo = promo.valueKobo ?? 0
    } else if (promo.type === 'cashback') {
      discountKobo = promo.valueKobo ?? 0
    }

    // Apply max discount cap for percent promotions
    if (promo.type === 'percent_discount' && promo.maxDiscountKobo && discountKobo > promo.maxDiscountKobo) {
      discountKobo = promo.maxDiscountKobo
    }

    const redemption = await promotionsRepository.createRedemption({
      promotionId: promo.id,
      userId,
      tripId,
      discountKobo,
    })

    return { promotion: promo, redemption, discountKobo }
  },

  // User: list my redemptions
  async listMyRedemptions(userId: string, limit = 20, offset = 0) {
    return promotionsRepository.listRedemptionsByUser(userId, limit, offset)
  },

  // Referrals
  async createReferral(referrerId: string, code: string, rewardKobo?: number) {
    const existing = await promotionsRepository.findReferralByCode(code)
    if (existing) throw errors.conflict('Referral code already exists')

    return promotionsRepository.createReferral({
      referrerId,
      referredId: '', // Will be filled when someone uses the code
      code,
      rewardKobo,
    })
  },

  async getReferralByCode(code: string) {
    return promotionsRepository.findReferralByCode(code)
  },

  async completeReferral(referralId: string, referredId: string, rewardKobo: number) {
    return promotionsRepository.updateReferralReward(referralId, rewardKobo)
  },

  async listMyReferrals(referrerId: string, limit = 20, offset = 0) {
    return promotionsRepository.listReferralsByReferrer(referrerId, limit, offset)
  },

  // Admin: create promotion
  async createPromotion(data: {
    code: string
    type: 'flat_discount' | 'percent_discount' | 'free_ride' | 'cashback'
    target: 'rider' | 'driver' | 'both'
    valueKobo?: number
    valuePercent?: number
    maxDiscountKobo?: number
    budgetKobo: number
    maxRedemptions?: number
    maxPerUser?: number
    startsAt: Date
    endsAt?: Date
    createdBy: string
  }) {
    // Validate required fields based on type
    if (data.type === 'percent_discount' && !data.valuePercent) {
      throw errors.badRequest('valuePercent required for percent_discount type')
    }
    if ((data.type === 'flat_discount' || data.type === 'free_ride' || data.type === 'cashback') && !data.valueKobo) {
      throw errors.badRequest('valueKobo required for this promotion type')
    }

    return promotionsRepository.createPromotion({
      code: data.code,
      type: data.type,
      target: data.target,
      valueKobo: data.valueKobo,
      valuePercent: data.valuePercent,
      maxDiscountKobo: data.maxDiscountKobo,
      budgetKobo: data.budgetKobo,
      maxRedemptions: data.maxRedemptions,
      maxPerUser: data.maxPerUser ?? 1,
      isActive: true,
      startsAt: data.startsAt,
      endsAt: data.endsAt,
      createdBy: data.createdBy,
      spentKobo: 0,
      redemptionCount: 0,
    })
  },

  // Admin: list all promotions
  async listAllPromotions(limit = 20, offset = 0) {
    return promotionsRepository.listPromotions({ activeOnly: false, limit, offset })
  },

  // Admin: update promotion
  async updatePromotion(id: string, data: Partial<{
    code: string
    isActive: boolean
    budgetKobo: number
    maxRedemptions: number
    maxPerUser: number
    endsAt: Date
  }>) {
    return promotionsRepository.updatePromotion(id, data)
  },

  // Admin: delete promotion
  async deletePromotion(id: string) {
    return promotionsRepository.deletePromotion(id)
  },
}