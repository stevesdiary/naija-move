import { pgTable, uuid, text, timestamp, bigint, pgEnum } from 'drizzle-orm/pg-core'

export const paymentIntentStatusEnum = pgEnum('payment_intent_status', [
  'pending',
  'authorized',
  'captured',
  'failed',
  'refunded',
  'partially_refunded',
])

export const paymentIntents = pgTable('payment_intents', {
  id: uuid('id').primaryKey(),
  ownerId: uuid('owner_id').notNull(),
  ownerType: text('owner_type').notNull(), // rider | corporate
  referenceId: uuid('reference_id').notNull(), // tripId
  referenceType: text('reference_type').notNull(),
  provider: text('provider').notNull().default('paystack'),
  providerReference: text('provider_reference').unique(),
  amountKobo: bigint('amount_kobo', { mode: 'number' }).notNull(),
  currency: text('currency').notNull().default('NGN'),
  status: paymentIntentStatusEnum('status').notNull().default('pending'),
  idempotencyKey: text('idempotency_key').notNull().unique(),
  metadata: text('metadata'), // JSON string
  authorizedAt: timestamp('authorized_at', { withTimezone: true }),
  capturedAt: timestamp('captured_at', { withTimezone: true }),
  failedAt: timestamp('failed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// Idempotent — provider callbacks stored verbatim, processed once
export const paymentCallbacks = pgTable('payment_callbacks', {
  id: uuid('id').primaryKey(),
  provider: text('provider').notNull(),
  eventType: text('event_type').notNull(),
  providerReference: text('provider_reference').notNull(),
  idempotencyKey: text('idempotency_key').notNull().unique(),
  payload: text('payload').notNull(), // raw JSON string
  processedAt: timestamp('processed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const refunds = pgTable('refunds', {
  id: uuid('id').primaryKey(),
  paymentIntentId: uuid('payment_intent_id').notNull().references(() => paymentIntents.id),
  amountKobo: bigint('amount_kobo', { mode: 'number' }).notNull(),
  reason: text('reason').notNull(),
  providerReference: text('provider_reference'),
  initiatedBy: uuid('initiated_by').notNull(),
  approvedBy: uuid('approved_by'),
  status: text('status').notNull().default('pending'), // pending | completed | failed
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
