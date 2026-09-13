import type { FastifyInstance } from 'fastify'
import { authenticate, authorize } from '../../lib/rbac.js'
import { driversService } from '../drivers/drivers.service.js'
import { ridesService } from '../rides/rides.service.js'
import { pricingService } from '../pricing/pricing.service.js'
import { db } from '../../db/index.js'
import { trips, riders, drivers, users } from '../../db/schema/index.js'
import { eq, desc, and, isNull, count, sql } from 'drizzle-orm'
import { z } from 'zod'
import { errors } from '../../lib/errors.js'
import { clampLimit, clampOffset } from '../../lib/pagination.js'

const pricingConfigSchema = z.object({
  city: z.string().min(1),
  category: z.enum(['standard', 'comfort', 'xl', 'bike', 'tricycle']),
  baseFareKobo: z.number().int().positive(),
  perKmKobo: z.number().int().positive(),
  perMinKobo: z.number().int().positive(),
  bookingFeeKobo: z.number().int().min(0),
  cancellationFeeKobo: z.number().int().min(0),
  floorFuelEstimateKobo: z.number().int().positive(),
  floorWearReserveKobo: z.number().int().positive(),
  floorDriverTimeValueKobo: z.number().int().positive(),
  platformFeePercent: z.number().min(0).max(1),
  surgeCapMultiplier: z.number().min(1).max(5),
  effectiveFrom: z.string().datetime(),
  effectiveTo: z.string().datetime().optional(),
})

const surgeWindowSchema = z.object({
  city: z.string().min(1),
  category: z.enum(['standard', 'comfort', 'xl', 'bike', 'tricycle']),
  multiplier: z.number().min(1).max(5),
  reason: z.string().min(1),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
})

export async function adminRoutes(app: FastifyInstance) {
  // ── Trips ──────────────────────────────────────────────────────────────────

  app.get('/trips', { preHandler: [authenticate, authorize('admin')] }, async (req) => {
    const { status, limit, offset } = req.query as {
      status?: string
      limit?: string
      offset?: string
    }

    const conditions: any[] = [isNull(trips.deletedAt)]
    if (status) conditions.push(eq(trips.status, status as any))

    const rows = await db.query.trips.findMany({
      where: and(...conditions),
      orderBy: [desc(trips.createdAt)],
      limit: clampLimit(limit, 50),
      offset: clampOffset(offset),
    })

    return { trips: rows }
  })

  app.get<{ Params: { tripId: string } }>(
    '/trips/:tripId',
    { preHandler: [authenticate, authorize('admin')] },
    async (req) => {
      return ridesService.getTrip(req.params.tripId)
    },
  )

  app.post<{ Params: { tripId: string }; Body: { reason: string } }>(
    '/trips/:tripId/cancel',
    { preHandler: [authenticate, authorize('admin')] },
    async (req) => {
      const { reason } = req.body
      if (!reason) throw errors.badRequest('reason is required')
      return ridesService.cancelTrip(req.params.tripId, req.user.sub, 'system', reason)
    },
  )

  // ── Drivers ────────────────────────────────────────────────────────────────

  app.get('/drivers', { preHandler: [authenticate, authorize('admin')] }, async (req) => {
    const { status, limit, offset } = req.query as {
      status?: string
      limit?: string
      offset?: string
    }
    return driversService.adminList({
      status,
      limit: clampLimit(limit, 50),
      offset: clampOffset(offset),
    })
  })

  app.post<{ Params: { driverId: string } }>(
    '/drivers/:driverId/approve',
    { preHandler: [authenticate, authorize('admin')] },
    async (req) => driversService.adminApprove(req.params.driverId, req.user.sub),
  )

  app.post<{ Params: { driverId: string }; Body: { reason: string } }>(
    '/drivers/:driverId/suspend',
    { preHandler: [authenticate, authorize('admin')] },
    async (req) => {
      const { reason } = req.body
      if (!reason) throw errors.badRequest('reason is required')
      return driversService.adminSuspend(req.params.driverId, req.user.sub, reason)
    },
  )

  // ── Pricing ────────────────────────────────────────────────────────────────

  app.get('/pricing', { preHandler: [authenticate, authorize('admin')] }, async (req) => {
    const { city, category } = req.query as { city?: string; category?: string }
    return pricingService.listConfigs(city, category)
  })

  app.post('/pricing', { preHandler: [authenticate, authorize('admin')] }, async (req) => {
    const body = pricingConfigSchema.parse(req.body)
    return pricingService.createConfig({
      ...body,
      effectiveFrom: new Date(body.effectiveFrom),
      effectiveTo: body.effectiveTo ? new Date(body.effectiveTo) : undefined,
    })
  })

  app.post('/pricing/surge', { preHandler: [authenticate, authorize('admin')] }, async (req) => {
    const body = surgeWindowSchema.parse(req.body)
    return pricingService.createSurgeWindow({
      ...body,
      startsAt: new Date(body.startsAt),
      endsAt: new Date(body.endsAt),
      createdBy: req.user.sub,
    })
  })

  // ── Marketplace report ─────────────────────────────────────────────────────

  app.get('/reports/marketplace', { preHandler: [authenticate, authorize('admin')] }, async () => {
    const [tripStats] = await db
      .select({
        total: count(),
        completed: sql<number>`COUNT(*) FILTER (WHERE status = 'completed')`,
        cancelled: sql<number>`COUNT(*) FILTER (WHERE status = 'cancelled')`,
        active: sql<number>`COUNT(*) FILTER (WHERE status NOT IN ('completed', 'cancelled'))`,
        revenueKobo: sql<number>`COALESCE(SUM(platform_fee_kobo) FILTER (WHERE status = 'completed'), 0)`,
      })
      .from(trips)
      .where(isNull(trips.deletedAt))

    const [driverStats] = await db
      .select({
        total: count(),
        online: sql<number>`COUNT(*) FILTER (WHERE is_online = true)`,
        approved: sql<number>`COUNT(*) FILTER (WHERE status = 'approved')`,
      })
      .from(drivers)
      .where(isNull(drivers.deletedAt))

    const [riderStats] = await db
      .select({ total: count() })
      .from(riders)
      .where(isNull(riders.deletedAt))

    return {
      trips: {
        total: Number(tripStats?.total ?? 0),
        completed: Number(tripStats?.completed ?? 0),
        cancelled: Number(tripStats?.cancelled ?? 0),
        active: Number(tripStats?.active ?? 0),
        revenueKobo: Number(tripStats?.revenueKobo ?? 0),
      },
      drivers: {
        total: Number(driverStats?.total ?? 0),
        online: Number(driverStats?.online ?? 0),
        approved: Number(driverStats?.approved ?? 0),
      },
      riders: {
        total: Number(riderStats?.total ?? 0),
      },
    }
  })
}
