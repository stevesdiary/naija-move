import { z } from 'zod'

export const createPlanSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().max(500).optional(),
  platformFeePercent: z.number().min(0).max(100),
  weeklyFeeKobo: z.number().int().nonnegative(),
})

export const updatePlanSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  description: z.string().max(500).optional(),
  platformFeePercent: z.number().min(0).max(100).optional(),
  weeklyFeeKobo: z.number().int().nonnegative().optional(),
  isActive: z.boolean().optional(),
})

export const subscribeSchema = z.object({
  planId: z.string().uuid(),
})

export type CreatePlanBody = z.infer<typeof createPlanSchema>
export type UpdatePlanBody = z.infer<typeof updatePlanSchema>
export type SubscribeBody = z.infer<typeof subscribeSchema>