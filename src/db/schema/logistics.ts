import { pgTable, uuid, text, timestamp, bigint, real, pgEnum } from 'drizzle-orm/pg-core'
import { drivers } from './drivers.js'

export const deliveryStatusEnum = pgEnum('delivery_status', [
  'pending',
  'matched',
  'picked_up',
  'in_transit',
  'delivered',
  'failed',
  'cancelled',
])

export const deliveryJobs = pgTable('delivery_jobs', {
  id: uuid('id').primaryKey(),
  merchantId: uuid('merchant_id').notNull(),
  driverId: uuid('driver_id').references(() => drivers.id),

  pickupAddress: text('pickup_address').notNull(),
  pickupLat: real('pickup_lat').notNull(),
  pickupLng: real('pickup_lng').notNull(),

  dropoffAddress: text('dropoff_address').notNull(),
  dropoffLat: real('dropoff_lat').notNull(),
  dropoffLng: real('dropoff_lng').notNull(),

  recipientName: text('recipient_name').notNull(),
  recipientPhone: text('recipient_phone').notNull(),

  parcelType: text('parcel_type').notNull(),
  parcelDescription: text('parcel_description'),
  declaredValueKobo: bigint('declared_value_kobo', { mode: 'number' }),

  status: deliveryStatusEnum('status').notNull().default('pending'),
  priceKobo: bigint('price_kobo', { mode: 'number' }).notNull(),
  driverAmountKobo: bigint('driver_amount_kobo', { mode: 'number' }),

  scheduledFor: timestamp('scheduled_for', { withTimezone: true }),
  pickedUpAt: timestamp('picked_up_at', { withTimezone: true }),
  deliveredAt: timestamp('delivered_at', { withTimezone: true }),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const deliveryProofs = pgTable('delivery_proofs', {
  id: uuid('id').primaryKey(),
  deliveryJobId: uuid('delivery_job_id').notNull().references(() => deliveryJobs.id),
  otp: text('otp'),
  otpVerifiedAt: timestamp('otp_verified_at', { withTimezone: true }),
  photoUrl: text('photo_url'),
  recipientConfirmed: text('recipient_confirmed'), // name or signature reference
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
