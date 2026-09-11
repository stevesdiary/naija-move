import { pgTable, uuid, text, timestamp, bigint, pgEnum } from 'drizzle-orm/pg-core'
import { users } from './identity.js'

export const walletOwnerTypeEnum = pgEnum('wallet_owner_type', [
  'rider',
  'driver',
  'corporate',
  'fleet_owner',
])

export const wallets = pgTable('wallets', {
  id: uuid('id').primaryKey(),
  ownerId: uuid('owner_id').notNull(),
  ownerType: walletOwnerTypeEnum('owner_type').notNull(),
  currency: text('currency').notNull().default('NGN'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// Wallet balance is always derived from ledger_entries — this table is for
// convenience caching only and must never be the source of truth
export const walletTransactions = pgTable('wallet_transactions', {
  id: uuid('id').primaryKey(),
  walletId: uuid('wallet_id').notNull().references(() => wallets.id),
  ledgerEntryId: uuid('ledger_entry_id').notNull(),
  type: text('type').notNull(), // credit | debit
  amountKobo: bigint('amount_kobo', { mode: 'number' }).notNull(),
  description: text('description').notNull(),
  referenceId: uuid('reference_id'), // tripId, payoutId, etc.
  referenceType: text('reference_type'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
