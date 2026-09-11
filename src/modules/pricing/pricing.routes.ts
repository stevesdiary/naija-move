import type { FastifyInstance } from 'fastify'
import { authenticate, authorize } from '../../lib/rbac.js'
import {
  quoteRequestSchema,
  createConfigSchema,
  createSurgeWindowSchema,
  type QuoteRequestBody,
  type CreateConfigBody,
  type CreateSurgeWindowBody,
} from './pricing.schema.js'
import { pricingService } from './pricing.service.js'

export async function pricingRoutes(app: FastifyInstance) {
  // Public fare quote (rider can call before auth)
  app.post<{ Body: QuoteRequestBody }>('/quote', async (req) => {
    const body = quoteRequestSchema.parse(req.body)
    // Use a default riderId for anonymous quotes, or get from auth if available
    const riderId = req.user?.sub ?? 'anonymous'
    return pricingService.getQuote({ ...body, riderId })
  })

  // Authenticated rider quote (uses actual rider ID)
  app.post<{ Body: QuoteRequestBody }>('/quote', { preHandler: [authenticate, authorize('rider')] }, async (req) => {
    const body = quoteRequestSchema.parse(req.body)
    return pricingService.getQuote({ ...body, riderId: req.user.sub })
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