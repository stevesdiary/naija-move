import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
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

const sql = neon(env.DATABASE_URL)

export const db = drizzle(sql, {
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
