import { z } from 'zod'

export const quoteRequestSchema = z.object({
  city: z.string().min(1).max(50),
  category: z.enum(['economy', 'comfort', 'premium', 'xl']),
  pickupLat: z.number().min(-90).max(90),
  pickupLng: z.number().min(-180).max(180),
  destinationLat: z.number().min(-90).max(90),
  destinationLng: z.number().min(-180).max(180),
  distanceMeters: z.number().int().positive(),
  durationSeconds: z.number().int().positive(),
})

export const createConfigSchema = z.object({
  city: z.string().min(1).max(50),
  category: z.enum(['economy', 'comfort', 'premium', 'xl']),
  baseFareKobo: z.number().int().nonnegative(),
  perKmKobo: z.number().int().nonnegative(),
  perMinKobo: z.number().int().nonnegative(),
  bookingFeeKobo: z.number().int().nonnegative(),
  cancellationFeeKobo: z.number().int().nonnegative().default(0),
  floorFuelEstimateKobo: z.number().int().nonnegative(),
  floorWearReserveKobo: z.number().int().nonnegative(),
  floorDriverTimeValueKobo: z.number().int().nonnegative(),
  platformFeePercent: z.number().min(0).max(1),
  surgeCapMultiplier: z.number().min(1).max(5).default(3.0),
  effectiveFrom: z.string().datetime(),
  effectiveTo: z.string().datetime().optional(),
})

export const createSurgeWindowSchema = z.object({
  city: z.string().min(1).max(50),
  category: z.enum(['economy', 'comfort', 'premium', 'xl']),
  multiplier: z.number().min(1).max(5),
  reason: z.string().max(255).optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
})

export type QuoteRequestBody = z.infer<typeof quoteRequestSchema>
export type CreateConfigBody = z.infer<typeof createConfigSchema>
export type CreateSurgeWindowBody = z.infer<typeof createSurgeWindowSchema>