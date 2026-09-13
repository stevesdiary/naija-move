import type { FastifyInstance } from 'fastify'
import { authenticate, authorize } from '../../lib/rbac.js'
import {
  availabilitySchema,
  locationSchema,
  documentUploadSchema,
  profilePhotoSchema,
  adminActionSchema,
  type AvailabilityBody,
  type LocationBody,
  type DocumentUploadBody,
  type AdminActionBody,
  type ProfilePhotoBody,
} from './drivers.schema.js'
import { driversService } from './drivers.service.js'
import { clampLimit, clampOffset } from '../../lib/pagination.js'

export async function driverRoutes(app: FastifyInstance) {
  // Any rider can apply to drive; the profile stays `pending` until an admin approves it.
  app.post('/register', { preHandler: [authenticate, authorize('rider')] }, async (req) => {
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

  // Short-lived read URL for one of my documents (admins may read any)
  app.get<{ Params: { documentId: string } }>(
    '/documents/:documentId/url',
    { preHandler: [authenticate, authorize('driver', 'admin')] },
    async (req) => driversService.documentUrl(req.params.documentId, { userId: req.user.sub, role: req.user.role }),
  )

  // Attach an uploaded profile photo
  app.post<{ Body: ProfilePhotoBody }>('/me/photo', { preHandler: [authenticate, authorize('driver', 'rider')] }, async (req) => {
    const body = profilePhotoSchema.parse(req.body)
    return driversService.setProfilePhoto(req.user.sub, body.fileKey)
  })

  app.get('/status-history', { preHandler: [authenticate, authorize('driver')] }, async (req) => {
    return driversService.getStatusHistory(req.user.sub)
  })

  // Admin routes
  app.get('/', { preHandler: [authenticate, authorize('admin')] }, async (req) => {
    const { status, limit, offset } = req.query as { status?: string; limit?: string; offset?: string }
    return driversService.adminList({
      status,
      limit: clampLimit(limit, 50),
      offset: clampOffset(offset),
    })
  })

  app.get<{ Params: { driverId: string } }>(
    '/:driverId/documents',
    { preHandler: [authenticate, authorize('admin')] },
    async (req) => driversService.adminListDocuments(req.params.driverId),
  )

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