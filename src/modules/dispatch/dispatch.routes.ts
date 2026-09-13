import type { FastifyInstance } from 'fastify'
import { authenticate, authorize } from '../../lib/rbac.js'
import { dispatchService } from './dispatch.service.js'
import { ridesRepository } from '../rides/rides.repository.js'
import { errors } from '../../lib/errors.js'
import { driverIdFor } from '../../lib/actors.js'

export async function dispatchRoutes(app: FastifyInstance) {
  // Admin: manually trigger dispatch for a stuck trip
  app.post<{ Params: { tripId: string } }>(
    '/trips/:tripId/dispatch',
    { preHandler: [authenticate, authorize('admin')] },
    async (req) => {
      const { tripId } = req.params
      return dispatchService.dispatch(tripId)
    },
  )

  // Admin: view dispatch attempts for a trip
  app.get<{ Params: { tripId: string } }>(
    '/trips/:tripId/attempts',
    { preHandler: [authenticate, authorize('admin')] },
    async (req) => {
      const { tripId } = req.params
      const attempts = await ridesRepository.getDispatchAttempts(tripId)
      return { tripId, attempts }
    },
  )

  // Admin: view pending offers for a trip
  app.get<{ Params: { tripId: string } }>(
    '/trips/:tripId/offers',
    { preHandler: [authenticate, authorize('admin')] },
    async (req) => {
      const { tripId } = req.params
      const offers = await ridesRepository.getPendingOffersForTrip(tripId)
      return { tripId, offers }
    },
  )

  // Driver: view their pending offers
  app.get(
    '/offers/me',
    { preHandler: [authenticate, authorize('driver')] },
    async (req) => {
      const offers = await ridesRepository.getOffersForDriver(await driverIdFor(req.user.sub))
      return { offers }
    },
  )

  // Admin: find nearby available drivers for a location
  app.get(
    '/nearby-drivers',
    { preHandler: [authenticate, authorize('admin')] },
    async (req) => {
      const { lat, lng, radius } = req.query as { lat: string; lng: string; radius?: string }
      if (!lat || !lng) throw errors.badRequest('lat and lng are required')
      const candidates = await dispatchService.findCandidates(
        parseFloat(lat),
        parseFloat(lng),
        radius ? parseFloat(radius) : 5,
      )
      return { candidates }
    },
  )
}
