import { pgTable, uuid, text, timestamp, boolean, real, pgEnum } from 'drizzle-orm/pg-core'
import { users } from './identity.js'

/** Rider KYC lifecycle: unverified → pending → verified | rejected. */
export const riderKycStatusEnum = pgEnum('rider_kyc_status', ['unverified', 'pending', 'verified', 'rejected'])

export const riders = pgTable('riders', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull().unique().references(() => users.id),
  rating: real('rating').notNull().default(5.0),
  totalTrips: text('total_trips').notNull().default('0'),
  preferredPaymentMethod: text('preferred_payment_method'),
  // Identity / KYC. `nin` and `ninData` are AES-256-GCM encrypted at rest
  // (see lib/field-encryption.ts); never store them in the clear.
  kycStatus: riderKycStatusEnum('kyc_status').notNull().default('unverified'),
  nin: text('nin'),
  ninVerified: boolean('nin_verified').notNull().default(false),
  ninData: text('nin_data'),
  kycVerifiedAt: timestamp('kyc_verified_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
})

export const savedPlaces = pgTable('saved_places', {
  id: uuid('id').primaryKey(),
  riderId: uuid('rider_id').notNull().references(() => riders.id),
  label: text('label').notNull(), // home | work | custom
  name: text('name').notNull(),
  address: text('address').notNull(),
  lat: real('lat').notNull(),
  lng: real('lng').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const emergencyContacts = pgTable('emergency_contacts', {
  id: uuid('id').primaryKey(),
  riderId: uuid('rider_id').notNull().references(() => riders.id),
  name: text('name').notNull(),
  phone: text('phone').notNull(),
  shareTrips: boolean('share_trips').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
