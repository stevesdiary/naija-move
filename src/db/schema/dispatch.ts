import { pgTable, uuid, text, timestamp, integer, real, pgEnum } from 'drizzle-orm/pg-core'
import { trips } from './rides.js'
import { drivers } from './drivers.js'

export const offerStatusEnum = pgEnum('offer_status', [
  'pending',
  'accepted',
  'declined',
  'expired',
])

export const driverOffers = pgTable('driver_offers', {
  id: uuid('id').primaryKey(),
  tripId: uuid('trip_id').notNull().references(() => trips.id),
  driverId: uuid('driver_id').notNull().references(() => drivers.id),
  status: offerStatusEnum('status').notNull().default('pending'),
  estimatedPickupSeconds: integer('estimated_pickup_seconds'),
  driverLatAtOffer: real('driver_lat_at_offer'),
  driverLngAtOffer: real('driver_lng_at_offer'),
  declineReason: text('decline_reason'),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  respondedAt: timestamp('responded_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const dispatchAttempts = pgTable('dispatch_attempts', {
  id: uuid('id').primaryKey(),
  tripId: uuid('trip_id').notNull().references(() => trips.id),
  attemptNumber: integer('attempt_number').notNull(),
  driversContacted: integer('drivers_contacted').notNull().default(0),
  outcome: text('outcome').notNull(), // accepted | exhausted | cancelled
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
