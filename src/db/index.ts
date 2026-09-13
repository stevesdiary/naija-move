import pg from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { env } from '../config/env.js'
import * as identitySchema from './schema/identity.js'
import * as ridersSchema from './schema/riders.js'
import * as driversSchema from './schema/drivers.js'
import * as vehiclesSchema from './schema/vehicles.js'
import * as ridesSchema from './schema/rides.js'
import * as dispatchSchema from './schema/dispatch.js'
import * as pricingSchema from './schema/pricing.js'
import * as walletsSchema from './schema/wallets.js'
import * as ledgerSchema from './schema/ledger.js'
import * as paymentsSchema from './schema/payments.js'
import * as subscriptionsSchema from './schema/subscriptions.js'
import * as fleetSchema from './schema/fleet.js'
import * as logisticsSchema from './schema/logistics.js'
import * as corporateSchema from './schema/corporate.js'
import * as complianceSchema from './schema/compliance.js'
import * as safetySchema from './schema/safety.js'
import * as notificationsSchema from './schema/notifications.js'
import * as supportSchema from './schema/support.js'
import * as promotionsSchema from './schema/promotions.js'
import * as fraudSchema from './schema/fraud.js'

/**
 * Standard node-postgres pool. The database is a managed Postgres (Aiven), so
 * the Neon-specific serverless client cannot reach it; `pg` speaks the wire
 * protocol and supports the transactions the ledger paths need.
 *
 * TLS: when DATABASE_CERT is set the server certificate is verified against
 * that CA (no `rejectUnauthorized: false` — that would accept any MITM cert).
 */
// pg lets values parsed from the connection string override explicit options,
// and `?sslmode=require` parses to a bare `ssl: true` (system CAs only) which
// would discard the pinned CA below — so strip it and configure TLS explicitly.
const connectionUrl = new URL(env.DATABASE_URL)
const sslMode = connectionUrl.searchParams.get('sslmode')
connectionUrl.searchParams.delete('sslmode')
const wantsTls = env.DATABASE_CERT !== undefined || (sslMode !== null && sslMode !== 'disable')

export const pool = new pg.Pool({
  connectionString: connectionUrl.toString(),
  ssl: env.DATABASE_CERT
    ? { ca: env.DATABASE_CERT, rejectUnauthorized: true }
    : wantsTls
      ? { rejectUnauthorized: true } // system CA store (e.g. Neon, RDS with public CAs)
      : undefined,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
})

pool.on('error', (err) => {
  console.error('Postgres pool error:', err)
})

export const db = drizzle(pool, {
  schema: {
    ...identitySchema,
    ...ridersSchema,
    ...driversSchema,
    ...vehiclesSchema,
    ...ridesSchema,
    ...dispatchSchema,
    ...pricingSchema,
    ...walletsSchema,
    ...ledgerSchema,
    ...paymentsSchema,
    ...subscriptionsSchema,
    ...fleetSchema,
    ...logisticsSchema,
    ...corporateSchema,
    ...complianceSchema,
    ...safetySchema,
    ...notificationsSchema,
    ...supportSchema,
    ...promotionsSchema,
    ...fraudSchema,
  },
})

export type DB = typeof db
export type Tx = Parameters<Parameters<DB['transaction']>[0]>[0]
