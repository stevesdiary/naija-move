import type { FastifyInstance } from 'fastify'
import { authenticate, authorize } from '../../lib/rbac.js'
import { driversService } from '../drivers/drivers.service.js'

export async function adminRoutes(app: FastifyInstance) {
  app.get('/trips', { preHandler: [authenticate, authorize('admin')] }, async (req) => {
    // TODO: Phase 6 - implement trip listing
    return { trips: [], message: 'Trip listing - Phase 6' }
  })

  app.get('/drivers', { preHandler: [authenticate, authorize('admin')] }, async (req) => {
    const { status, limit, offset } = req.query as { status?: string; limit?: string; offset?: string }
    return driversService.adminList({
      status,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0,
    })
  })

  app.post<{ Params: { driverId: string }; Body: { reason?: string } }>(
    '/drivers/:driverId/approve',
    { preHandler: [authenticate, authorize('admin')] },
    async (req) => {
      const { driverId } = req.params
      return driversService.adminApprove(driverId, req.user.sub)
    },
  )

  app.post<{ Params: { driverId: string }; Body: { reason: string } }>(
    '/drivers/:driverId/suspend',
    { preHandler: [authenticate, authorize('admin')] },
    async (req) => {
      const { driverId } = req.params
      const { reason } = req.body
      if (!reason) throw new Error('Reason required for suspension')
      return driversService.adminSuspend(driverId, req.user.sub, reason)
    },
  )

  app.get('/reports/marketplace', { preHandler: [authenticate, authorize('admin')] }, async (req) => {
    // TODO: Phase 11 - implement marketplace analytics
    return {
      totalTrips: 0,
      activeDrivers: 0,
      activeRiders: 0,
      revenueKobo: 0,
      message: 'Marketplace report - Phase 11',
    }
  })

  app.post('/pricing', { preHandler: [authenticate, authorize('admin')] }, async (req) => {
    // TODO: Phase 5 - implement pricing config management
    return { message: 'Pricing config - Phase 5' }
  })
}