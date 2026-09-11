import { pgTable, uuid, text, timestamp, boolean, real, pgEnum } from 'drizzle-orm/pg-core'
import { users } from './identity.js'

export const driverStatusEnum = pgEnum('driver_status', [
  'pending',
  'under_review',
  'approved',
  'suspended',
  'rejected',
  'expired',
])

export const documentTypeEnum = pgEnum('document_type', [
  'drivers_licence',
  'vehicle_registration',
  'insurance',
  'inspection',
  'background_check',
  'profile_photo',
])

export const drivers = pgTable('drivers', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull().unique().references(() => users.id),
  status: driverStatusEnum('status').notNull().default('pending'),
  isOnline: boolean('is_online').notNull().default(false),
  rating: real('rating').notNull().default(5.0),
  totalTrips: text('total_trips').notNull().default('0'),
  currentLat: real('current_lat'),
  currentLng: real('current_lng'),
  locationUpdatedAt: timestamp('location_updated_at', { withTimezone: true }),
  subscriptionPlanId: uuid('subscription_plan_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
})

export const driverDocuments = pgTable('driver_documents', {
  id: uuid('id').primaryKey(),
  driverId: uuid('driver_id').notNull().references(() => drivers.id),
  type: documentTypeEnum('type').notNull(),
  fileUrl: text('file_url'),
  referenceNumber: text('reference_number'),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  rejectedAt: timestamp('rejected_at', { withTimezone: true }),
  rejectionReason: text('rejection_reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const driverStatusHistory = pgTable('driver_status_history', {
  id: uuid('id').primaryKey(),
  driverId: uuid('driver_id').notNull().references(() => drivers.id),
  fromStatus: driverStatusEnum('from_status'),
  toStatus: driverStatusEnum('to_status').notNull(),
  reason: text('reason'),
  actorId: uuid('actor_id'), // admin user id
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
