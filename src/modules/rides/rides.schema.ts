import { z } from 'zod'

export const createTripSchema = z.object({
  pickupAddress: z.string().min(1).max(255),
  pickupLat: z.number().min(-90).max(90),
  pickupLng: z.number().min(-180).max(180),
  destinationAddress: z.string().min(1).max(255),
  destinationLat: z.number().min(-90).max(90),
  destinationLng: z.number().min(-180).max(180),
  paymentMethod: z.enum(['card', 'wallet', 'cash', 'bank_transfer', 'corporate_wallet']),
  quoteId: z.string().uuid(),
  mode: z.enum(['immediate', 'scheduled']).default('immediate'),
  scheduledFor: z.string().datetime().optional(),
})

export const cancelTripSchema = z.object({
  reason: z.string().min(1).max(500),
})

export const addStopSchema = z.object({
  address: z.string().min(1).max(255),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
})

export const updateDestinationSchema = z.object({
  destinationAddress: z.string().min(1).max(255),
  destinationLat: z.number().min(-90).max(90),
  destinationLng: z.number().min(-180).max(180),
})

export const verifyPinSchema = z.object({
  pin: z.string().length(4),
})

export const rateTripSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
})

export type CreateTripBody = z.infer<typeof createTripSchema>
export type CancelTripBody = z.infer<typeof cancelTripSchema>
export type AddStopBody = z.infer<typeof addStopSchema>
export type UpdateDestinationBody = z.infer<typeof updateDestinationSchema>
export type VerifyPinBody = z.infer<typeof verifyPinSchema>
export type RateTripBody = z.infer<typeof rateTripSchema>