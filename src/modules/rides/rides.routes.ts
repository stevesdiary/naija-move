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
import { riderIdFor, driverIdFor } from '../../lib/actors.js'
import { env } from '../../config/env.js'
import { errors } from '../../lib/errors.js'
import { secretEquals } from '../../lib/secrets.js'
import { clampLimit, clampOffset } from '../../lib/pagination.js'

export async function rideRoutes(app: FastifyInstance) {
  // Rider endpoints
  app.post<{ Body: CreateTripBody }>('/', { preHandler: [authenticate, authorize('rider')] }, async (req) => {
    const body = createTripSchema.parse(req.body)
    return ridesService.createTrip({
      ...body,
      riderId: await riderIdFor(req.user.sub),
      scheduledFor: body.scheduledFor ? new Date(body.scheduledFor) : undefined,
    })
  })

  app.get('/me', { preHandler: [authenticate, authorize('rider')] }, async (req) => {
    const { limit, offset } = req.query as { limit?: string; offset?: string }
    return ridesService.listTrips(await riderIdFor(req.user.sub), clampLimit(limit, 20), clampOffset(offset))
  })

  app.get('/:id', { preHandler: [authenticate, authorize('rider')] }, async (req) => {
    const { id } = req.params as { id: string }
    return ridesService.getTripForRider(id, await riderIdFor(req.user.sub))
  })

  app.post<{ Body: CancelTripBody; Params: { id: string } }>(
    '/:id/cancel',
    { preHandler: [authenticate, authorize('rider')] },
    async (req) => {
      const { id } = req.params
      const body = cancelTripSchema.parse(req.body)
      return ridesService.cancelTrip(id, await riderIdFor(req.user.sub), 'rider', body.reason)
    },
  )

  app.post<{ Body: AddStopBody; Params: { id: string } }>(
    '/:id/stops',
    { preHandler: [authenticate, authorize('rider')] },
    async (req) => {
      const { id } = req.params
      const body = addStopSchema.parse(req.body)
      return ridesService.addStop(id, await riderIdFor(req.user.sub), body.address, body.lat, body.lng)
    },
  )

  app.put<{ Body: UpdateDestinationBody; Params: { id: string } }>(
    '/:id/destination',
    { preHandler: [authenticate, authorize('rider')] },
    async (req) => {
      const { id } = req.params
      const body = updateDestinationSchema.parse(req.body)
      return ridesService.updateDestination(id, await riderIdFor(req.user.sub), body.destinationAddress, body.destinationLat, body.destinationLng)
    },
  )

  app.post<{ Body: RateTripBody; Params: { id: string } }>(
    '/:id/rate',
    { preHandler: [authenticate, authorize('rider')] },
    async (req) => {
      const { id } = req.params
      const body = rateTripSchema.parse(req.body)
      return ridesService.rateTrip(id, await riderIdFor(req.user.sub), 'rider', body.rating, body.comment, body.tipKobo)
    },
  )

  // Driver endpoints
  app.get('/driver/me', { preHandler: [authenticate, authorize('driver')] }, async (req) => {
    const { limit, offset } = req.query as { limit?: string; offset?: string }
    return ridesService.listDriverTrips(await driverIdFor(req.user.sub), clampLimit(limit, 20), clampOffset(offset))
  })

  app.post('/offers/:offerId/accept', { preHandler: [authenticate, authorize('driver')] }, async (req) => {
    const { offerId } = req.params as { offerId: string }
    return ridesService.acceptOffer(offerId, await driverIdFor(req.user.sub))
  })

  app.post<{ Body: { reason?: string }; Params: { offerId: string } }>(
    '/offers/:offerId/decline',
    { preHandler: [authenticate, authorize('driver')] },
    async (req) => {
      const { offerId } = req.params
      const { reason } = req.body
      return ridesService.declineOffer(offerId, await driverIdFor(req.user.sub), reason)
    },
  )

  app.post<{ Params: { tripId: string } }>(
    '/driver/trips/:tripId/arrive',
    { preHandler: [authenticate, authorize('driver')] },
    async (req) => {
      const { tripId } = req.params
      return ridesService.driverArrived(tripId, await driverIdFor(req.user.sub))
    },
  )

  app.post<{ Body: VerifyPinBody; Params: { tripId: string } }>(
    '/driver/trips/:tripId/start',
    { preHandler: [authenticate, authorize('driver')] },
    async (req) => {
      const { tripId } = req.params
      const body = verifyPinSchema.parse(req.body)
      return ridesService.verifyPinAndStart(tripId, body.pin, await driverIdFor(req.user.sub))
    },
  )

  app.post<{ Body: { finalDistanceMeters: number; finalDurationSeconds: number }; Params: { tripId: string } }>(
    '/driver/trips/:tripId/complete',
    { preHandler: [authenticate, authorize('driver')] },
    async (req) => {
      const { tripId } = req.params
      const { finalDistanceMeters, finalDurationSeconds } = req.body
      return ridesService.completeTrip(tripId, await driverIdFor(req.user.sub), finalDistanceMeters, finalDurationSeconds)
    },
  )

  app.post<{ Body: CancelTripBody; Params: { tripId: string } }>(
    '/driver/trips/:tripId/cancel',
    { preHandler: [authenticate, authorize('driver')] },
    async (req) => {
      const { tripId } = req.params
      const body = cancelTripSchema.parse(req.body)
      return ridesService.cancelTrip(tripId, await driverIdFor(req.user.sub), 'driver', body.reason)
    },
  )

  app.post<{ Body: RateTripBody; Params: { tripId: string } }>(
    '/driver/trips/:tripId/rate',
    { preHandler: [authenticate, authorize('driver')] },
    async (req) => {
      const { tripId } = req.params
      const body = rateTripSchema.parse(req.body)
      return ridesService.rateTrip(tripId, await driverIdFor(req.user.sub), 'driver', body.rating, body.comment)
    },
  )

  // Cleanup WS channel on trip completion/cancellation — internal callers only
  app.post('/internal/trips/:tripId/close-channel', async (req) => {
    if (!secretEquals(req.headers['x-internal-secret'], env.INTERNAL_JOB_SECRET)) throw errors.unauthorized()
    const { tripId } = req.params as { tripId: string }
    closeTripChannel(tripId)
    return { closed: true }
  })
}