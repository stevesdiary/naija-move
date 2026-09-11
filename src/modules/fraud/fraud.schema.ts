import { z } from 'zod'

export const reportFraudSchema = z.object({
  entityId: z.string().uuid(),
  entityType: z.enum(['user', 'trip', 'device']),
  signalType: z.enum([
    'gps_spoof',
    'impossible_travel',
    'duplicate_account',
    'device_sharing',
    'promo_abuse',
    'circular_trip',
    'abnormal_cancellation',
    'payment_risk',
  ]),
  description: z.string().min(10).max(1000),
})

export const createReviewSchema = z.object({
  signalId: z.string().uuid(),
  status: z.enum(['cleared', 'confirmed', 'escalated']),
  note: z.string().max(1000).optional(),
})

export const updateReviewSchema = z.object({
  status: z.enum(['pending', 'cleared', 'confirmed', 'escalated']).optional(),
  note: z.string().max(1000).optional(),
  actionTaken: z.string().optional(),
})

export type ReportFraudBody = z.infer<typeof reportFraudSchema>
export type CreateReviewBody = z.infer<typeof createReviewSchema>
export type UpdateReviewBody = z.infer<typeof updateReviewSchema>