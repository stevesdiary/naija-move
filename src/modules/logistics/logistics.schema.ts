import { z } from 'zod'

export const createDeliveryJobSchema = z.object({
  pickupAddress: z.string().min(1).max(255),
  pickupLat: z.number().min(-90).max(90),
  pickupLng: z.number().min(-180).max(180),
  dropoffAddress: z.string().min(1).max(255),
  dropoffLat: z.number().min(-90).max(90),
  dropoffLng: z.number().min(-180).max(180),
  recipientName: z.string().min(1).max(100),
  recipientPhone: z.string().regex(/^\+234[0-9]{10}$/),
  parcelType: z.string().min(1).max(50),
  parcelDescription: z.string().max(500).optional(),
  declaredValueKobo: z.number().int().nonnegative().optional(),
  priceKobo: z.number().int().positive(),
  scheduledFor: z.string().datetime().optional(),
})

export const submitProofSchema = z.object({
  otp: z.string().length(4).optional(),
  photoUrl: z.string().url().optional(),
  recipientConfirmed: z.string().max(200).optional(),
})

export type CreateDeliveryJobBody = z.infer<typeof createDeliveryJobSchema>
export type SubmitProofBody = z.infer<typeof submitProofSchema>