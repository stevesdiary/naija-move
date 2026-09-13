import Fastify from 'fastify'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import websocket from '@fastify/websocket'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import helmet from '@fastify/helmet'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { parse as parseYaml } from 'yaml'
import { errorHandler } from './lib/errors.js'
import { redis } from './lib/redis.js'
import { env } from './config/env.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Module routes
import { identityRoutes } from './modules/identity/identity.routes.js'
import { riderRoutes } from './modules/riders/riders.routes.js'
import { driverRoutes } from './modules/drivers/drivers.routes.js'
import { vehicleRoutes } from './modules/vehicles/vehicles.routes.js'
import { rideRoutes } from './modules/rides/rides.routes.js'
import { pricingRoutes } from './modules/pricing/pricing.routes.js'
import { paymentRoutes } from './modules/payments/payments.routes.js'
import { adminRoutes } from './modules/admin/admin.routes.js'
import { internalRoutes } from './modules/internal/internal.routes.js'
import { tripWsRoutes } from './websocket/trip.ws.js'
import { safetyRoutes } from './modules/safety/safety.routes.js'
import { notificationRoutes } from './modules/notifications/notifications.routes.js'
import { supportRoutes } from './modules/support/support.routes.js'
import { logisticsRoutes } from './modules/logistics/logistics.routes.js'
import { corporateRoutes } from './modules/corporate/corporate.routes.js'
import { fleetRoutes } from './modules/fleet/fleet.routes.js'
import { subscriptionsRoutes } from './modules/subscriptions/subscriptions.routes.js'
import { promotionsRoutes } from './modules/promotions/promotions.routes.js'
import { fraudRoutes } from './modules/fraud/fraud.routes.js'
import { complianceRoutes } from './modules/compliance/compliance.routes.js'
import { analyticsRoutes } from './modules/analytics/analytics.routes.js'
import { mapsRoutes } from './modules/maps/maps.routes.js'
import { dispatchRoutes } from './modules/dispatch/dispatch.routes.js'
import { ledgerRoutes } from './modules/ledger/ledger.routes.js'
import { walletRoutes } from './modules/wallets/wallets.routes.js'

export async function buildApp() {
  const app = Fastify({
    logger: {
      transport:
        env.NODE_ENV === 'development'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
      redact: ['req.headers.authorization', 'req.headers["x-internal-secret"]'],
      serializers: {
        // WebSocket clients pass the access token as ?token= — keep it out of the logs.
        req: (req) => ({
          method: req.method,
          url: req.url.replace(/([?&]token=)[^&]*/gi, '$1[redacted]'),
          hostname: req.hostname,
          remoteAddress: req.ip,
        }),
      },
    },
    genReqId: () => crypto.randomUUID(),
    bodyLimit: 256 * 1024, // 256 KiB — largest legitimate payload is a bulk notification
    // 0 = trust nothing (direct). Behind a proxy, X-Forwarded-For is only honoured for this many hops.
    trustProxy: env.TRUST_PROXY > 0 ? (_addr: string, hop: number) => hop < env.TRUST_PROXY : false,
  })

  // Swagger — load the static spec file
  const specPath = resolve(__dirname, '../openapi.yaml')
  const specDoc = parseYaml(readFileSync(specPath, 'utf8'))

  await app.register(swagger, { mode: 'static', specification: { document: specDoc } })
  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: { docExpansion: 'list', deepLinking: true },
    staticCSP: true,
    logLevel: 'silent',
  })

  // Plugins
  // Swagger UI ships its own CSP (staticCSP above); helmet's would block it, so CSP stays off for this JSON API.
  await app.register(helmet, { contentSecurityPolicy: false })
  await app.register(cors, {
    origin: env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })
  await app.register(rateLimit, {
    global: true,
    max: 100,
    timeWindow: '1 minute',
    redis,
  })
  await app.register(websocket)

  // Error handler
  app.setErrorHandler(errorHandler)

  // Health check
  app.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() }
  })

  // Routes
  await app.register(identityRoutes, { prefix: '/auth' })
  await app.register(riderRoutes, { prefix: '/riders' })
  await app.register(driverRoutes, { prefix: '/drivers' })
  await app.register(vehicleRoutes, { prefix: '/vehicles' })
  await app.register(rideRoutes, { prefix: '/rides' })
  await app.register(pricingRoutes, { prefix: '/pricing' })
  await app.register(paymentRoutes, { prefix: '/payments' })
  await app.register(adminRoutes, { prefix: '/admin' })
  await app.register(internalRoutes, { prefix: '/internal' })
  await app.register(tripWsRoutes)
  await app.register(safetyRoutes, { prefix: '/safety' })
  await app.register(notificationRoutes, { prefix: '/notifications' })
  await app.register(supportRoutes, { prefix: '/support' })
  await app.register(logisticsRoutes, { prefix: '/logistics' })
  await app.register(corporateRoutes, { prefix: '/corporate' })
  await app.register(fleetRoutes, { prefix: '/fleet' })
  await app.register(subscriptionsRoutes, { prefix: '/subscriptions' })
  await app.register(promotionsRoutes, { prefix: '/promotions' })
  await app.register(fraudRoutes, { prefix: '/fraud' })
  await app.register(complianceRoutes, { prefix: '/compliance' })
  await app.register(analyticsRoutes, { prefix: '/analytics' })
  await app.register(mapsRoutes, { prefix: '/maps' })
  await app.register(dispatchRoutes, { prefix: '/dispatch' })
  await app.register(ledgerRoutes, { prefix: '/ledger' })
  await app.register(walletRoutes, { prefix: '/wallet' })

  return app
}
