import type { FastifyInstance } from 'fastify'
import { authenticate, authorize } from '../../lib/rbac.js'
import {
  availabilitySchema,
  locationSchema,
  documentUploadSchema,
  adminActionSchema,
  type AvailabilityBody,
  type LocationBody,
  type DocumentUploadBody,
  type AdminActionBody,
} from './drivers.schema.js'
import { driversService } from './drivers.service.js'

export async function driverRoutes(app: FastifyInstance) {
  app.post('/register', { preHandler: [authenticate, authorize('driver')] }, async (req) => {
    return driversService.register(req.user.sub)
  })

  app.get('/me', { preHandler: [authenticate, authorize('driver')] }, async (req) => {
    return driversService.getProfile(req.user.sub)
  })

  app.post<{ Body: AvailabilityBody }>('/availability', { preHandler: [authenticate, authorize('driver')] }, async (req) => {
    const body = availabilitySchema.parse(req.body)
    return driversService.setAvailability(req.user.sub, body.isOnline)
  })

  app.post<{ Body: LocationBody }>('/location', { preHandler: [authenticate, authorize('driver')] }, async (req) => {
    const body = locationSchema.parse(req.body)
    return driversService.updateLocation(req.user.sub, body.lat, body.lng)
  })

  app.get('/offers', { preHandler: [authenticate, authorize('driver')] }, async (req) => {
    // TODO: Phase 6 - implement driver offers
    return { offers: [], message: 'Driver offers - Phase 6' }
  })

  app.post('/offers/:offerId/accept', { preHandler: [authenticate, authorize('driver')] }, async (req) => {
    // TODO: Phase 6 - implement offer acceptance
    return { message: 'Offer accepted - Phase 6' }
  })

  app.post('/offers/:offerId/decline', { preHandler: [authenticate, authorize('driver')] }, async (req) => {
    // TODO: Phase 6 - implement offer decline
    return { message: 'Offer declined - Phase 6' }
  })

  app.post('/trips/:tripId/arrive', { preHandler: [authenticate, authorize('driver')] }, async (req) => {
    // TODO: Phase 6 - implement driver arrived
    return { message: 'Driver arrived - Phase 6' }
  })

  app.post('/trips/:tripId/start', { preHandler: [authenticate, authorize('driver')] }, async (req) => {
    // TODO: Phase 6 - implement trip start
    return { message: 'Trip started - Phase 6' }
  })

  app.post('/trips/:tripId/complete', { preHandler: [authenticate, authorize('driver')] }, async (req) => {
    // TODO: Phase 6 - implement trip complete
    return { message: 'Trip completed - Phase 6' }
  })

  app.get('/earnings', { preHandler: [authenticate, authorize('driver')] }, async (req) => {
    return driversService.getEarnings(req.user.sub)
  })

  app.get('/heatmap', { preHandler: [authenticate, authorize('driver')] }, async (req) => {
    return driversService.getHeatmap(req.user.sub)
  })

  // Documents
  app.get('/documents', { preHandler: [authenticate, authorize('driver')] }, async (req) => {
    return driversService.listDocuments(req.user.sub)
  })

  app.post<{ Body: DocumentUploadBody }>('/documents', { preHandler: [authenticate, authorize('driver')] }, async (req) => {
    const body = documentUploadSchema.parse(req.body)
    return driversService.uploadDocument(req.user.sub, {
      ...body,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
    })
  })

  app.get('/status-history', { preHandler: [authenticate, authorize('driver')] }, async (req) => {
    return driversService.getStatusHistory(req.user.sub)
  })

  // Admin routes
  app.get('/', { preHandler: [authenticate, authorize('admin')] }, async (req) => {
    const { status, limit, offset } = req.query as { status?: string; limit?: string; offset?: string }
    return driversService.adminList({
      status,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0,
    })
  })

  app.post<{ Body: AdminActionBody; Params: { driverId: string } }>(
    '/:driverId/approve',
    { preHandler: [authenticate, authorize('admin')] },
    async (req) => {
      const { driverId } = req.params
      return driversService.adminApprove(driverId, req.user.sub)
    },
  )

  app.post<{ Body: AdminActionBody; Params: { driverId: string } }>(
    '/:driverId/suspend',
    { preHandler: [authenticate, authorize('admin')] },
    async (req) => {
      const { driverId } = req.params
      const body = adminActionSchema.parse(req.body)
      if (!body.reason) throw new Error('Reason required for suspension')
      return driversService.adminSuspend(driverId, req.user.sub, body.reason)
    },
  )
}