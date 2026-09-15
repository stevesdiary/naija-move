import type { FastifyInstance } from 'fastify'
import { authenticate, authorize } from '../../lib/rbac.js'
import { driversService } from '../drivers/drivers.service.js'
import { ridesService } from '../rides/rides.service.js'
import { pricingService } from '../pricing/pricing.service.js'
import { db } from '../../db/index.js'
import { trips, riders, drivers, users, supportCases, vehicles } from '../../db/schema/index.js'
import { eq, desc, and, isNull, count, sql, ilike, or } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { z } from 'zod'
import { errors } from '../../lib/errors.js'
import { clampLimit, clampOffset } from '../../lib/pagination.js'
import { snakeKeysDeep } from '../../lib/serialize.js'

const pricingConfigSchema = z.object({
  city: z.string().min(1),
  // Must match the vehicle_category DB enum (src/db/schema/vehicles.ts); the
  // pricing_configs.category column is that enum, so any other set fails to insert.
  category: z.enum(['economy', 'comfort', 'premium', 'xl']),
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
  category: z.enum(['economy', 'comfort', 'premium', 'xl']),
  multiplier: z.number().min(1).max(5),
  reason: z.string().min(1),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
})

export async function adminRoutes(app: FastifyInstance) {
  // Admin responses go to the dashboard, which expects snake_case. This lets the
  // handlers below return idiomatic camelCase; keys are converted on the way out.
  // Scoped to this (encapsulated) plugin, so mobile/API routes stay camelCase.
  app.addHook('preSerialization', async (_req, _reply, payload) => snakeKeysDeep(payload))

  // ── Trips ──────────────────────────────────────────────────────────────────

  app.get('/trips', { preHandler: [authenticate, authorize('admin')] }, async (req) => {
    const q = req.query as {
      status?: string
      category?: string
      limit?: string
      offset?: string
      page?: string
      per_page?: string
    }

    // The dashboard paginates with page/per_page and expects a { data, meta } envelope;
    // limit/offset are still accepted for API back-compat.
    const perPage = clampLimit(q.per_page ?? q.limit, 50)
    const page = q.page ? Math.max(1, Number.parseInt(q.page, 10) || 1) : undefined
    const offset = page ? (page - 1) * perPage : clampOffset(q.offset)

    // Category lives on the vehicle, so both queries join it.
    const riderUser = alias(users, 'rider_user')
    const driverUser = alias(users, 'driver_user')

    const conditions: any[] = [isNull(trips.deletedAt)]
    if (q.status) conditions.push(eq(trips.status, q.status as any))
    if (q.category) conditions.push(eq(vehicles.category, q.category as any))
    const whereExpr = and(...conditions)

    // The dashboard's trips table wants a flat, human-readable row (rider/driver
    // names, single fare in kobo), so this endpoint returns a DTO rather than the
    // raw camelCase trip row. Mobile clients use /rides, not this admin route.
    const rows = await db
      .select({
        id: trips.id,
        status: trips.status,
        pickup: trips.pickupAddress,
        destination: trips.destinationAddress,
        category: vehicles.category,
        fare: sql<number>`COALESCE(${trips.finalFareKobo}, ${trips.estimatedFareKobo}, 0)`,
        surge_multiplier: trips.surgeMultiplier,
        payment_method: trips.paymentMethod,
        rider: riderUser.name,
        driver: driverUser.name,
        created_at: trips.createdAt,
      })
      .from(trips)
      .leftJoin(riders, eq(trips.riderId, riders.id))
      .leftJoin(riderUser, eq(riders.userId, riderUser.id))
      .leftJoin(drivers, eq(trips.driverId, drivers.id))
      .leftJoin(driverUser, eq(drivers.userId, driverUser.id))
      .leftJoin(vehicles, eq(trips.vehicleId, vehicles.id))
      .where(whereExpr)
      .orderBy(desc(trips.createdAt))
      .limit(perPage)
      .offset(offset)

    const [totalRow] = await db
      .select({ total: count() })
      .from(trips)
      .leftJoin(vehicles, eq(trips.vehicleId, vehicles.id))
      .where(whereExpr)
    const total = Number(totalRow?.total ?? 0)
    const currentPage = page ?? Math.floor(offset / perPage) + 1

    return {
      data: rows.map((r) => ({ ...r, fare: Number(r.fare) })),
      meta: {
        total,
        page: currentPage,
        per_page: perPage,
        total_pages: Math.max(1, Math.ceil(total / perPage)),
      },
    }
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
    const q = req.query as {
      status?: string
      online?: string
      category?: string
      search?: string
      page?: string
      per_page?: string
      limit?: string
      offset?: string
    }
    const perPage = clampLimit(q.per_page ?? q.limit, 50)
    const page = q.page ? Math.max(1, Number.parseInt(q.page, 10) || 1) : undefined
    const offset = page ? (page - 1) * perPage : clampOffset(q.offset)

    const conditions: any[] = [isNull(drivers.deletedAt)]
    if (q.status) conditions.push(eq(drivers.status, q.status as any))
    if (q.online === 'true') conditions.push(eq(drivers.isOnline, true))
    else if (q.online === 'false') conditions.push(eq(drivers.isOnline, false))
    if (q.category) conditions.push(eq(vehicles.category, q.category as any))
    if (q.search) {
      const like = `%${q.search}%`
      conditions.push(or(ilike(users.name, like), ilike(users.phone, like)))
    }
    const whereExpr = and(...conditions)

    // Enriched, dashboard-shaped rows (camelCase; the preSerialization hook above
    // converts to snake_case). Join the active vehicle for plate/category.
    const vehicleJoin = and(eq(vehicles.driverId, drivers.id), eq(vehicles.isActive, true))
    const rows = await db
      .select({
        id: drivers.id,
        userId: drivers.userId,
        name: users.name,
        phone: users.phone,
        email: users.email,
        rating: drivers.rating,
        totalTrips: drivers.totalTrips,
        status: drivers.status,
        isOnline: drivers.isOnline,
        currentLat: drivers.currentLat,
        currentLng: drivers.currentLng,
        locationUpdatedAt: drivers.locationUpdatedAt,
        subscriptionPlanId: drivers.subscriptionPlanId,
        createdAt: drivers.createdAt,
        updatedAt: drivers.updatedAt,
        plate: vehicles.plate,
        vehicleMake: vehicles.make,
        vehicleModel: vehicles.model,
        vehicleCategory: vehicles.category,
      })
      .from(drivers)
      .leftJoin(users, eq(drivers.userId, users.id))
      .leftJoin(vehicles, vehicleJoin)
      .where(whereExpr)
      .orderBy(desc(drivers.createdAt))
      .limit(perPage)
      .offset(offset)

    const [totalRow] = await db
      .select({ total: sql<number>`COUNT(DISTINCT ${drivers.id})` })
      .from(drivers)
      .leftJoin(users, eq(drivers.userId, users.id))
      .leftJoin(vehicles, vehicleJoin)
      .where(whereExpr)
    const total = Number(totalRow?.total ?? 0)
    const currentPage = page ?? Math.floor(offset / perPage) + 1

    return {
      data: rows.map((r) => ({
        id: r.id,
        userId: r.userId,
        name: r.name,
        phone: r.phone,
        email: r.email ?? undefined,
        rating: r.rating,
        totalTrips: Number(r.totalTrips ?? 0),
        status: r.status,
        isOnline: r.isOnline,
        currentLat: r.currentLat ?? undefined,
        currentLng: r.currentLng ?? undefined,
        locationUpdatedAt: r.locationUpdatedAt,
        subscriptionPlanId: r.subscriptionPlanId ?? undefined,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        plate: r.plate ?? undefined,
        vehicle: r.plate
          ? { plate: r.plate, make: r.vehicleMake, model: r.vehicleModel, category: r.vehicleCategory }
          : undefined,
      })),
      meta: {
        total,
        page: currentPage,
        per_page: perPage,
        total_pages: Math.max(1, Math.ceil(total / perPage)),
      },
    }
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

  // ── Dashboard metrics (composite) ──────────────────────────────────────────
  // Powers the ops dashboard landing page: GET /admin/dashboard/metrics.
  // Returns the four top-line KPIs plus a live driver-status breakdown; the
  // chart/list sections are returned as empty arrays until the historical and
  // live-trip pipelines (and seed data) are in place — the dashboard renders
  // empty states for those.
  app.get('/dashboard/metrics', { preHandler: [authenticate, authorize('admin')] }, async () => {
    // One pass over trips: today's breakdown + yesterday totals (for real trends).
    const [tripAgg] = await db
      .select({
        today: sql<number>`COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE)`,
        completedToday: sql<number>`COUNT(*) FILTER (WHERE status = 'completed' AND created_at >= CURRENT_DATE)`,
        cancelledToday: sql<number>`COUNT(*) FILTER (WHERE status = 'cancelled' AND created_at >= CURRENT_DATE)`,
        activeToday: sql<number>`COUNT(*) FILTER (WHERE status NOT IN ('completed', 'cancelled') AND created_at >= CURRENT_DATE)`,
        yesterday: sql<number>`COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '1 day' AND created_at < CURRENT_DATE)`,
        revenueToday: sql<number>`COALESCE(SUM(final_fare_kobo) FILTER (WHERE status = 'completed' AND completed_at >= CURRENT_DATE), 0)`,
        platformFeesToday: sql<number>`COALESCE(SUM(platform_fee_kobo) FILTER (WHERE status = 'completed' AND completed_at >= CURRENT_DATE), 0)`,
        revenueYesterday: sql<number>`COALESCE(SUM(final_fare_kobo) FILTER (WHERE status = 'completed' AND completed_at >= CURRENT_DATE - INTERVAL '1 day' AND completed_at < CURRENT_DATE), 0)`,
      })
      .from(trips)
      .where(isNull(trips.deletedAt))

    const [driverAgg] = await db
      .select({
        online: sql<number>`COUNT(*) FILTER (WHERE is_online = true)`,
        approved: sql<number>`COUNT(*) FILTER (WHERE status = 'approved')`,
        approvedOffline: sql<number>`COUNT(*) FILTER (WHERE status = 'approved' AND is_online = false)`,
        pending: sql<number>`COUNT(*) FILTER (WHERE status IN ('pending', 'under_review'))`,
        suspended: sql<number>`COUNT(*) FILTER (WHERE status = 'suspended')`,
      })
      .from(drivers)
      .where(isNull(drivers.deletedAt))

    const [caseAgg] = await db
      .select({
        open: sql<number>`COUNT(*) FILTER (WHERE status NOT IN ('resolved', 'closed'))`,
        escalated: sql<number>`COUNT(*) FILTER (WHERE status = 'escalated')`,
      })
      .from(supportCases)

    const n = (v: unknown) => Number(v ?? 0)
    const online = n(driverAgg?.online)
    const approved = n(driverAgg?.approved)
    const tripsToday = n(tripAgg?.today)
    const tripsYesterday = n(tripAgg?.yesterday)
    const revenueToday = n(tripAgg?.revenueToday)
    const revenueYesterday = n(tripAgg?.revenueYesterday)

    // Percentage change vs yesterday, rounded to 1 dp; null when there's no baseline.
    const pctChange = (today: number, yesterday: number): number | null =>
      yesterday > 0 ? Math.round(((today - yesterday) / yesterday) * 1000) / 10 : (today > 0 ? 100 : null)

    return {
      trips_today: tripsToday,
      trips_completed_today: n(tripAgg?.completedToday),
      trips_cancelled_today: n(tripAgg?.cancelledToday),
      trips_active_today: n(tripAgg?.activeToday),
      trips_trend_pct: pctChange(tripsToday, tripsYesterday),
      active_drivers: online,
      drivers_approved: approved,
      drivers_online_rate: approved > 0 ? Math.round((online / approved) * 1000) / 10 : 0,
      revenue_today: revenueToday, // kobo — the dashboard divides by 100
      platform_fees_today: n(tripAgg?.platformFeesToday),
      revenue_trend_pct: pctChange(revenueToday, revenueYesterday),
      open_support_cases: n(caseAgg?.open),
      escalated_support_cases: n(caseAgg?.escalated),
      driver_status: [
        { status: 'Online', count: online, color: '#10b981' },
        { status: 'Offline', count: n(driverAgg?.approvedOffline), color: '#94a3b8' },
        { status: 'Pending', count: n(driverAgg?.pending), color: '#f59e0b' },
        { status: 'Suspended', count: n(driverAgg?.suspended), color: '#ef4444' },
      ],
      trips_trend: [],
      revenue_breakdown: [],
      top_drivers: [],
      recent_fraud: [],
      live_trips: [],
      surge_zones: [],
    }
  })
}
