import { z } from 'zod'

export const createPromotionSchema = z.object({
  code: z.string().min(1).max(20).toUpperCase(),
  type: z.enum(['flat_discount', 'percent_discount', 'free_ride', 'cashback']),
  target: z.enum(['rider', 'driver', 'both']).default('rider'),
  valueKobo: z.number().int().positive().optional(),
  valuePercent: z.number().min(1).max(100).optional(),
  maxDiscountKobo: z.number().int().positive().optional(),
  budgetKobo: z.number().int().positive(),
  maxRedemptions: z.number().int().positive().optional(),
  maxPerUser: z.number().int().positive().default(1),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().optional(),
})

export const updatePromotionSchema = z.object({
  code: z.string().min(1).max(20).toUpperCase().optional(),
  isActive: z.boolean().optional(),
  budgetKobo: z.number().int().positive().optional(),
  maxRedemptions: z.number().int().positive().optional(),
  maxPerUser: z.number().int().positive().optional(),
  endsAt: z.string().datetime().optional(),
})

export const redeemPromotionSchema = z.object({
  code: z.string().min(1).max(20).toUpperCase(),
  tripId: z.string().uuid().optional(),
})

export const referralSchema = z.object({
  code: z.string().min(1).max(20),
})

export type CreatePromotionBody = z.infer<typeof createPromotionSchema>
export type UpdatePromotionBody = z.infer<typeof updatePromotionSchema>
export type RedeemPromotionBody = z.infer<typeof redeemPromotionSchema>
export type ReferralBody = z.infer<typeof referralSchema>