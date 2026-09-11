import { pgTable, uuid, text, timestamp, real, boolean, pgEnum } from 'drizzle-orm/pg-core'

export const fraudSignalTypeEnum = pgEnum('fraud_signal_type', [
  'gps_spoof',
  'impossible_travel',
  'duplicate_account',
  'device_sharing',
  'promo_abuse',
  'circular_trip',
  'abnormal_cancellation',
  'payment_risk',
])

export const fraudReviewStatusEnum = pgEnum('fraud_review_status', [
  'pending',
  'cleared',
  'confirmed',
  'escalated',
])

export const fraudSignals = pgTable('fraud_signals', {
  id: uuid('id').primaryKey(),
  entityId: uuid('entity_id').notNull(), // userId, tripId, deviceId
  entityType: text('entity_type').notNull(), // user | trip | device
  signalType: fraudSignalTypeEnum('signal_type').notNull(),
  confidence: real('confidence'), // 0.0 - 1.0
  metadata: text('metadata'), // JSON string with signal-specific data
  tripId: uuid('trip_id'),
  requiresReview: boolean('requires_review').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const fraudReviews = pgTable('fraud_reviews', {
  id: uuid('id').primaryKey(),
  fraudSignalId: uuid('fraud_signal_id').notNull().references(() => fraudSignals.id),
  reviewedBy: uuid('reviewed_by'),
  status: fraudReviewStatusEnum('status').notNull().default('pending'),
  note: text('note'),
  actionTaken: text('action_taken'), // suspended | warned | cleared | banned
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
