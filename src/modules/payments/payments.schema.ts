import { z } from 'zod'

export const initializePaymentSchema = z.object({
  tripId: z.string().uuid(),
  email: z.string().email(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export const webhookSchema = z.object({
  event: z.string(),
  data: z.record(z.string(), z.unknown()),
})

export const refundSchema = z.object({
  reference: z.string().min(1),
  amountKobo: z.number().int().positive().optional(),
})

export const driverPayoutSchema = z.object({
  driverId: z.string().uuid(),
  amountKobo: z.number().int().positive(),
  settlementCycleId: z.string().uuid(),
})

export type InitializePaymentBody = z.infer<typeof initializePaymentSchema>
export type WebhookBody = z.infer<typeof webhookSchema>
export type RefundBody = z.infer<typeof refundSchema>
export type DriverPayoutBody = z.infer<typeof driverPayoutSchema>