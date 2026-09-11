import { pgTable, uuid, text, timestamp, boolean, real, bigint, pgEnum } from 'drizzle-orm/pg-core'
import { vehicleCategoryEnum } from './vehicles.js'

export const pricingConfigs = pgTable('pricing_configs', {
  id: uuid('id').primaryKey(),
  city: text('city').notNull(),
  category: vehicleCategoryEnum('category').notNull(),
  baseFareKobo: bigint('base_fare_kobo', { mode: 'number' }).notNull(),
  perKmKobo: bigint('per_km_kobo', { mode: 'number' }).notNull(),
  perMinKobo: bigint('per_min_kobo', { mode: 'number' }).notNull(),
  bookingFeeKobo: bigint('booking_fee_kobo', { mode: 'number' }).notNull(),
  cancellationFeeKobo: bigint('cancellation_fee_kobo', { mode: 'number' }).notNull().default(0),
  // Fare floor components (kobo)
  floorFuelEstimateKobo: bigint('floor_fuel_estimate_kobo', { mode: 'number' }).notNull(),
  floorWearReserveKobo: bigint('floor_wear_reserve_kobo', { mode: 'number' }).notNull(),
  floorDriverTimeValueKobo: bigint('floor_driver_time_value_kobo', { mode: 'number' }).notNull(),
  platformFeePercent: real('platform_fee_percent').notNull(), // e.g. 0.08 = 8%
  surgeCapMultiplier: real('surge_cap_multiplier').notNull().default(3.0),
  isActive: boolean('is_active').notNull().default(true),
  effectiveFrom: timestamp('effective_from', { withTimezone: true }).notNull(),
  effectiveTo: timestamp('effective_to', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const fareQuotes = pgTable('fare_quotes', {
  id: uuid('id').primaryKey(),
  riderId: uuid('rider_id').notNull(),
  pricingConfigId: uuid('pricing_config_id').notNull().references(() => pricingConfigs.id),
  pickupLat: real('pickup_lat').notNull(),
  pickupLng: real('pickup_lng').notNull(),
  destinationLat: real('destination_lat').notNull(),
  destinationLng: real('destination_lng').notNull(),
  distanceMeters: bigint('distance_meters', { mode: 'number' }).notNull(),
  durationSeconds: bigint('duration_seconds', { mode: 'number' }).notNull(),
  estimatedFareKobo: bigint('estimated_fare_kobo', { mode: 'number' }).notNull(),
  floorFareKobo: bigint('floor_fare_kobo', { mode: 'number' }).notNull(),
  surgeMultiplier: real('surge_multiplier').notNull().default(1.0),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const surgeWindows = pgTable('surge_windows', {
  id: uuid('id').primaryKey(),
  city: text('city').notNull(),
  category: vehicleCategoryEnum('category').notNull(),
  multiplier: real('multiplier').notNull(),
  reason: text('reason'),
  startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
  endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
