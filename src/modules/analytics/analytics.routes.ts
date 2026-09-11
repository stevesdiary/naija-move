import type { FastifyInstance } from 'fastify'
import { authenticate, authorize } from '../../lib/rbac.js'
import { analyticsService } from './analytics.service.js'

export async function analyticsRoutes(app: FastifyInstance) {
  // Admin: marketplace overview
  app.get('/marketplace', { preHandler: [authenticate, authorize('admin')] }, async (req) => {
    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string }
    return analyticsService.getMarketplaceAnalytics({ startDate, endDate })
  })

  // Admin: trips trend
  app.get('/trips/trend', { preHandler: [authenticate, authorize('admin')] }, async (req) => {
    const { startDate, endDate, interval } = req.query as { startDate?: string; endDate?: string; interval?: 'hour' | 'day' | 'week' | 'month' }
    return analyticsService.getTripsTrend({ startDate, endDate, interval })
  })

  // Admin: revenue trend
  app.get('/revenue/trend', { preHandler: [authenticate, authorize('admin')] }, async (req) => {
    const { startDate, endDate, interval } = req.query as { startDate?: string; endDate?: string; interval?: 'day' | 'week' | 'month' }
    return analyticsService.getRevenueTrend({ startDate, endDate, interval })
  })

  // Driver: my analytics
  app.get('/driver/:driverId', { preHandler: [authenticate] }, async (req) => {
    const { driverId } = req.params as { driverId: string }
    // Allow self or admin
    if (req.user.sub !== driverId && req.user.role !== 'admin') {
      return { error: 'Unauthorized' }
    }
    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string }
    return analyticsService.getDriverAnalytics(driverId, { startDate, endDate })
  })

  // Driver: earnings history
  app.get('/driver/:driverId/earnings', { preHandler: [authenticate] }, async (req) => {
    const { driverId } = req.params as { driverId: string }
    if (req.user.sub !== driverId && req.user.role !== 'admin') {
      return { error: 'Unauthorized' }
    }
    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string }
    return analyticsService.getDriverEarningsHistory(driverId, { startDate, endDate })
  })

  // Rider: my analytics
  app.get('/rider/:riderId', { preHandler: [authenticate] }, async (req) => {
    const { riderId } = req.params as { riderId: string }
    if (req.user.sub !== riderId && req.user.role !== 'admin') {
      return { error: 'Unauthorized' }
    }
    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string }
    return analyticsService.getRiderAnalytics(riderId, { startDate, endDate })
  })

  // Admin: logistics analytics
  app.get('/logistics', { preHandler: [authenticate, authorize('admin')] }, async (req) => {
    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string }
    return analyticsService.getLogisticsAnalytics({ startDate, endDate })
  })

  // Admin: fraud analytics
  app.get('/fraud', { preHandler: [authenticate, authorize('admin')] }, async (req) => {
    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string }
    return analyticsService.getFraudAnalytics({ startDate, endDate })
  })

  // Admin: compliance analytics
  app.get('/compliance', { preHandler: [authenticate, authorize('admin')] }, async (req) => {
    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string }
    return analyticsService.getComplianceAnalytics({ startDate, endDate })
  })

  // Admin: subscription analytics
  app.get('/subscriptions', { preHandler: [authenticate, authorize('admin')] }, async () => {
    return analyticsService.getSubscriptionAnalytics()
  })
}