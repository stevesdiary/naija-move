import { pricingRepository } from './pricing.repository.js'
import { redis } from '../../lib/idempotency.js'
import { errors } from '../../lib/errors.js'

const QUOTE_TTL_SECONDS = 5 * 60 // 5 minutes
const CONFIG_CACHE_TTL = 60 * 60 // 1 hour

export interface FareBreakdown {
  baseFareKobo: number
  distanceFareKobo: number
  timeFareKobo: number
  bookingFeeKobo: number
  subtotalKobo: number
  floorFareKobo: number
  surgeMultiplier: number
  estimatedFareKobo: number
  platformFeeKobo: number
  driverAmountKobo: number
}

export interface QuoteResult {
  quoteId: string
  estimatedFareKobo: number
  breakdown: FareBreakdown
  expiresAt: Date
}

export const pricingService = {
  async getQuote(params: {
    city: string
    category: string
    pickupLat: number
    pickupLng: number
    destinationLat: number
    destinationLng: number
    distanceMeters: number
    durationSeconds: number
    riderId: string
  }): Promise<QuoteResult> {
    // Get active pricing config (cached)
    const cacheKey = `pricing:${params.city}:${params.category}`
    let config = await redis.get<any>(cacheKey)

    if (!config) {
      config = await pricingRepository.findActiveConfig(params.city, params.category)
      if (!config) throw errors.notFound(`No pricing config for ${params.city} / ${params.category}`)
      await redis.set(cacheKey, config, { ex: CONFIG_CACHE_TTL })
    }

    // Check for active surge
    const surge = await pricingRepository.getActiveSurge(params.city, params.category)
    const surgeMultiplier = surge?.multiplier ?? 1.0

    // Apply surge cap
    const effectiveSurgeMultiplier = Math.min(surgeMultiplier, config.surgeCapMultiplier)

    // Calculate fare components
    const distanceKm = params.distanceMeters / 1000
    const durationMin = params.durationSeconds / 60

    const distanceFareKobo = Math.round(distanceKm * config.perKmKobo)
    const timeFareKobo = Math.round(durationMin * config.perMinKobo)
    const subtotalKobo = config.baseFareKobo + distanceFareKobo + timeFareKobo + config.bookingFeeKobo

    // Calculate floor fare (minimum fare components)
    const floorFareKobo = config.floorFuelEstimateKobo + config.floorWearReserveKobo + config.floorDriverTimeValueKobo

    // Apply surge to subtotal
    const surgedSubtotal = Math.round(subtotalKobo * effectiveSurgeMultiplier)

    // Final fare is max of surged subtotal and floor
    const estimatedFareKobo = Math.max(surgedSubtotal, floorFareKobo)

    // Platform fee
    const platformFeeKobo = Math.round(estimatedFareKobo * config.platformFeePercent)
    const driverAmountKobo = estimatedFareKobo - platformFeeKobo

    const breakdown: FareBreakdown = {
      baseFareKobo: config.baseFareKobo,
      distanceFareKobo,
      timeFareKobo,
      bookingFeeKobo: config.bookingFeeKobo,
      subtotalKobo,
      floorFareKobo,
      surgeMultiplier: effectiveSurgeMultiplier,
      estimatedFareKobo,
      platformFeeKobo,
      driverAmountKobo,
    }

    const expiresAt = new Date(Date.now() + QUOTE_TTL_SECONDS * 1000)

    const quote = await pricingRepository.createFareQuote({
      riderId: params.riderId,
      pricingConfigId: config.id,
      pickupLat: params.pickupLat,
      pickupLng: params.pickupLng,
      destinationLat: params.destinationLat,
      destinationLng: params.destinationLng,
      distanceMeters: params.distanceMeters,
      durationSeconds: params.durationSeconds,
      estimatedFareKobo,
      floorFareKobo,
      surgeMultiplier: effectiveSurgeMultiplier,
      expiresAt,
    })

    if (!quote) throw errors.internal('Failed to create fare quote')

    // Cache quote for quick validation
    await redis.set(`quote:${quote.id}`, JSON.stringify(quote), { ex: QUOTE_TTL_SECONDS })

    return {
      quoteId: quote.id,
      estimatedFareKobo,
      breakdown,
      expiresAt,
    }
  },

  async validateQuote(quoteId: string) {
    const cached = await redis.get<string>(`quote:${quoteId}`)
    if (cached) return JSON.parse(cached)

    const quote = await pricingRepository.findValidQuote(quoteId)
    if (!quote) throw errors.unprocessable('Quote expired or already used')

    await redis.set(`quote:${quoteId}`, JSON.stringify(quote), { ex: QUOTE_TTL_SECONDS })
    return quote
  },

  async consumeQuote(quoteId: string) {
    await pricingRepository.markQuoteUsed(quoteId)
    await redis.del(`quote:${quoteId}`)
  },

  async createConfig(data: {
    city: string
    category: string
    baseFareKobo: number
    perKmKobo: number
    perMinKobo: number
    bookingFeeKobo: number
    cancellationFeeKobo: number
    floorFuelEstimateKobo: number
    floorWearReserveKobo: number
    floorDriverTimeValueKobo: number
    platformFeePercent: number
    surgeCapMultiplier: number
    effectiveFrom: Date
    effectiveTo?: Date
  }) {
    const config = await pricingRepository.createConfig(data)
    // Invalidate cache
    await redis.del(`pricing:${data.city}:${data.category}`)
    return config
  },

  async listConfigs(city?: string, category?: string) {
    return pricingRepository.listConfigs(city, category)
  },

  async createSurgeWindow(data: {
    city: string
    category: string
    multiplier: number
    reason: string
    startsAt: Date
    endsAt: Date
    createdBy: string
  }) {
    if (data.multiplier < 1 || data.multiplier > 5) {
      throw errors.unprocessable('Surge multiplier must be between 1 and 5')
    }
    return pricingRepository.createSurgeWindow(data)
  },
}