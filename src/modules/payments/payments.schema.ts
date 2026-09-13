import { z } from 'zod'

// No client-supplied metadata: the webhook branches on metadata.context, so
// letting the payer set it would let them turn a trip payment into a wallet credit.
export const initializePaymentSchema = z.object({
  tripId: z.string().uuid(),
  email: z.string().email(),
})

export const walletTopupSchema = z.object({
  amountKobo: z.number().int().min(10000, 'Minimum top-up is ₦100'),
  email: z.string().email(),
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
export type WalletTopupBody = z.infer<typeof walletTopupSchema>
export type WebhookBody = z.infer<typeof webhookSchema>
export type RefundBody = z.infer<typeof refundSchema>
export type DriverPayoutBody = z.infer<typeof driverPayoutSchema>