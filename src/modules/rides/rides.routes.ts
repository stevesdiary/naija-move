import type { FastifyInstance } from 'fastify'
import { authenticate, authorize } from '../../lib/rbac.js'
import {
  createTripSchema,
  cancelTripSchema,
  addStopSchema,
  updateDestinationSchema,
  verifyPinSchema,
  rateTripSchema,
  type CreateTripBody,
  type CancelTripBody,
  type AddStopBody,
  type UpdateDestinationBody,
  type VerifyPinBody,
  type RateTripBody,
} from './rides.schema.js'
import { ridesService } from './rides.service.js'
import { closeTripChannel } from '../../websocket/trip.ws.js'

export async function rideRoutes(app: FastifyInstance) {
  // Rider endpoints
  app.post<{ Body: CreateTripBody }>('/', { preHandler: [authenticate, authorize('rider')] }, async (req) => {
    const body = createTripSchema.parse(req.body)
    return ridesService.createTrip({ 
      ...body, 
      riderId: req.user.sub,
      scheduledFor: body.scheduledFor ? new Date(body.scheduledFor) : undefined,
    })
  })

  app.get('/me', { preHandler: [authenticate, authorize('rider')] }, async (req) => {
    const { limit, offset } = req.query as { limit?: string; offset?: string }
    return ridesService.listTrips(req.user.sub, limit ? parseInt(limit) : 20, offset ? parseInt(offset) : 0)
  })

  app.get('/:id', { preHandler: [authenticate, authorize('rider')] }, async (req) => {
    const { id } = req.params as { id: string }
    return ridesService.getTrip(id)
  })

  app.post<{ Body: CancelTripBody; Params: { id: string } }>(
    '/:id/cancel',
    { preHandler: [authenticate, authorize('rider')] },
    async (req) => {
      const { id } = req.params
      const body = cancelTripSchema.parse(req.body)
      return ridesService.cancelTrip(id, req.user.sub, 'rider', body.reason)
    },
  )

  app.post<{ Body: AddStopBody; Params: { id: string } }>(
    '/:id/stops',
    { preHandler: [authenticate, authorize('rider')] },
    async (req) => {
      const { id } = req.params
      const body = addStopSchema.parse(req.body)
      return ridesService.addStop(id, req.user.sub, body.address, body.lat, body.lng)
    },
  )

  app.put<{ Body: UpdateDestinationBody; Params: { id: string } }>(
    '/:id/destination',
    { preHandler: [authenticate, authorize('rider')] },
    async (req) => {
      const { id } = req.params
      const body = updateDestinationSchema.parse(req.body)
      return ridesService.updateDestination(id, req.user.sub, body.destinationAddress, body.destinationLat, body.destinationLng)
    },
  )

  app.post<{ Body: RateTripBody; Params: { id: string } }>(
    '/:id/rate',
    { preHandler: [authenticate, authorize('rider')] },
    async (req) => {
      const { id } = req.params
      const body = rateTripSchema.parse(req.body)
      return ridesService.rateTrip(id, req.user.sub, 'rider', body.rating, body.comment)
    },
  )

  // Driver endpoints
  app.get('/driver/me', { preHandler: [authenticate, authorize('driver')] }, async (req) => {
    const { limit, offset } = req.query as { limit?: string; offset?: string }
    return ridesService.listDriverTrips(req.user.sub, limit ? parseInt(limit) : 20, offset ? parseInt(offset) : 0)
  })

  app.post('/offers/:offerId/accept', { preHandler: [authenticate, authorize('driver')] }, async (req) => {
    const { offerId } = req.params as { offerId: string }
    return ridesService.acceptOffer(offerId, req.user.sub)
  })

  app.post<{ Body: { reason?: string }; Params: { offerId: string } }>(
    '/offers/:offerId/decline',
    { preHandler: [authenticate, authorize('driver')] },
    async (req) => {
      const { offerId } = req.params
      const { reason } = req.body
      return ridesService.declineOffer(offerId, req.user.sub, reason)
    },
  )

  app.post<{ Params: { tripId: string } }>(
    '/driver/trips/:tripId/arrive',
    { preHandler: [authenticate, authorize('driver')] },
    async (req) => {
      const { tripId } = req.params
      return ridesService.driverArrived(tripId, req.user.sub)
    },
  )

  app.post<{ Body: VerifyPinBody; Params: { tripId: string } }>(
    '/driver/trips/:tripId/start',
    { preHandler: [authenticate, authorize('driver')] },
    async (req) => {
      const { tripId } = req.params
      const body = verifyPinSchema.parse(req.body)
      return ridesService.verifyPinAndStart(tripId, body.pin, req.user.sub)
    },
  )

  app.post<{ Body: { finalDistanceMeters: number; finalDurationSeconds: number }; Params: { tripId: string } }>(
    '/driver/trips/:tripId/complete',
    { preHandler: [authenticate, authorize('driver')] },
    async (req) => {
      const { tripId } = req.params
      const { finalDistanceMeters, finalDurationSeconds } = req.body
      return ridesService.completeTrip(tripId, req.user.sub, finalDistanceMeters, finalDurationSeconds)
    },
  )

  app.post<{ Body: CancelTripBody; Params: { tripId: string } }>(
    '/driver/trips/:tripId/cancel',
    { preHandler: [authenticate, authorize('driver')] },
    async (req) => {
      const { tripId } = req.params
      const body = cancelTripSchema.parse(req.body)
      return ridesService.cancelTrip(tripId, req.user.sub, 'driver', body.reason)
    },
  )

  app.post<{ Body: RateTripBody; Params: { tripId: string } }>(
    '/driver/trips/:tripId/rate',
    { preHandler: [authenticate, authorize('driver')] },
    async (req) => {
      const { tripId } = req.params
      const body = rateTripSchema.parse(req.body)
      return ridesService.rateTrip(tripId, req.user.sub, 'driver', body.rating, body.comment)
    },
  )

  // Cleanup WS channel on trip completion/cancellation (internal use)
  app.post('/internal/trips/:tripId/close-channel', async (req) => {
    const { tripId } = req.params as { tripId: string }
    closeTripChannel(tripId)
    return { closed: true }
  })
}