import { pgTable, uuid, text, timestamp, integer, real, bigint, boolean, pgEnum } from 'drizzle-orm/pg-core'
import { riders } from './riders.js'
import { drivers } from './drivers.js'
import { vehicles } from './vehicles.js'

export const tripStatusEnum = pgEnum('trip_status', [
  'requested',
  'matched',
  'driver_arriving',
  'driver_arrived',
  'in_progress',
  'completed',
  'cancelled',
])

export const tripModeEnum = pgEnum('trip_mode', [
  'immediate',
  'scheduled',
  'negotiated',
])

export const paymentMethodEnum = pgEnum('payment_method', [
  'card',
  'wallet',
  'cash',
  'bank_transfer',
  'corporate_wallet',
])

export const trips = pgTable('trips', {
  id: uuid('id').primaryKey(),
  riderId: uuid('rider_id').notNull().references(() => riders.id),
  driverId: uuid('driver_id').references(() => drivers.id),
  vehicleId: uuid('vehicle_id').references(() => vehicles.id),
  status: tripStatusEnum('status').notNull().default('requested'),
  mode: tripModeEnum('mode').notNull().default('immediate'),

  // Pickup
  pickupAddress: text('pickup_address').notNull(),
  pickupLat: real('pickup_lat').notNull(),
  pickupLng: real('pickup_lng').notNull(),

  // Destination
  destinationAddress: text('destination_address').notNull(),
  destinationLat: real('destination_lat').notNull(),
  destinationLng: real('destination_lng').notNull(),

  // Fare — all amounts in kobo
  estimatedFareKobo: bigint('estimated_fare_kobo', { mode: 'number' }),
  finalFareKobo: bigint('final_fare_kobo', { mode: 'number' }),
  platformFeeKobo: bigint('platform_fee_kobo', { mode: 'number' }),
  driverAmountKobo: bigint('driver_amount_kobo', { mode: 'number' }),
  tipKobo: bigint('tip_kobo', { mode: 'number' }).default(0),
  surgeMultiplier: real('surge_multiplier').default(1.0),

  paymentMethod: paymentMethodEnum('payment_method'),
  paymentIntentId: uuid('payment_intent_id'),

  // Trip PIN
  pin: text('pin'),
  pinVerified: boolean('pin_verified').notNull().default(false),

  // Route
  distanceMeters: integer('distance_meters'),
  durationSeconds: integer('duration_seconds'),
  polyline: text('polyline'),

  // Scheduling
  scheduledFor: timestamp('scheduled_for', { withTimezone: true }),

  // Timestamps
  matchedAt: timestamp('matched_at', { withTimezone: true }),
  driverArrivedAt: timestamp('driver_arrived_at', { withTimezone: true }),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  cancellationReason: text('cancellation_reason'),
  cancelledBy: text('cancelled_by'), // rider | driver | system

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
})

export const tripStops = pgTable('trip_stops', {
  id: uuid('id').primaryKey(),
  tripId: uuid('trip_id').notNull().references(() => trips.id),
  sequence: integer('sequence').notNull(),
  address: text('address').notNull(),
  lat: real('lat').notNull(),
  lng: real('lng').notNull(),
  arrivedAt: timestamp('arrived_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const tripEvents = pgTable('trip_events', {
  id: uuid('id').primaryKey(),
  tripId: uuid('trip_id').notNull().references(() => trips.id),
  event: text('event').notNull(), // matches domain event names
  actorId: uuid('actor_id'),
  actorType: text('actor_type'), // rider | driver | system | admin
  metadata: text('metadata'), // JSON string
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const tripRatings = pgTable('trip_ratings', {
  id: uuid('id').primaryKey(),
  tripId: uuid('trip_id').notNull().unique().references(() => trips.id),
  riderRating: integer('rider_rating'), // 1-5, driver rates rider
  driverRating: integer('driver_rating'), // 1-5, rider rates driver
  riderComment: text('rider_comment'),
  driverComment: text('driver_comment'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
