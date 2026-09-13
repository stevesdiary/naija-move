import type { FastifyInstance } from 'fastify'
import { authenticate, authorize, optionalAuthenticate } from '../../lib/rbac.js'
import {
  quoteRequestSchema,
  createConfigSchema,
  createSurgeWindowSchema,
  type QuoteRequestBody,
  type CreateConfigBody,
  type CreateSurgeWindowBody,
} from './pricing.schema.js'
import { pricingService } from './pricing.service.js'
import { maps } from '../../providers/maps.js'
import { riderIdFor } from '../../lib/actors.js'

export async function pricingRoutes(app: FastifyInstance) {
  // Fare quote — works anonymously (pre-auth) and binds to the rider when a token is sent
  app.post<{ Body: QuoteRequestBody }>('/quote', { preHandler: optionalAuthenticate }, async (req) => {
    const body = quoteRequestSchema.parse(req.body)
    // Quotes are bound to the rider *profile* id (what trips reference), or null when unauthenticated.
    const riderId = req.user ? await riderIdFor(req.user.sub) : null
    const route = await maps.getRoute(
      { lat: body.pickupLat, lng: body.pickupLng },
      { lat: body.destinationLat, lng: body.destinationLng },
    )
    return pricingService.getQuote({
      ...body,
      distanceMeters: route.distanceMeters,
      durationSeconds: route.durationSeconds,
      riderId,
    })
  })

  // Admin: manage pricing configs
  app.get('/configs', { preHandler: [authenticate, authorize('admin')] }, async (req) => {
    const { city, category } = req.query as { city?: string; category?: string }
    return pricingService.listConfigs(city, category)
  })

  app.post<{ Body: CreateConfigBody }>('/configs', { preHandler: [authenticate, authorize('admin')] }, async (req) => {
    const body = createConfigSchema.parse(req.body)
    return pricingService.createConfig({
      ...body,
      effectiveFrom: new Date(body.effectiveFrom),
      effectiveTo: body.effectiveTo ? new Date(body.effectiveTo) : undefined,
    })
  })

  // Admin: manage surge windows
  app.post<{ Body: CreateSurgeWindowBody }>('/surge', { preHandler: [authenticate, authorize('admin')] }, async (req) => {
    const body = createSurgeWindowSchema.parse(req.body)
    return pricingService.createSurgeWindow({
      ...body,
      reason: body.reason ?? '',
      startsAt: new Date(body.startsAt),
      endsAt: new Date(body.endsAt),
      createdBy: req.user.sub,
    })
  })
}