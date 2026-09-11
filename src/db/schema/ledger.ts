import { pgTable, uuid, text, timestamp, bigint, pgEnum } from 'drizzle-orm/pg-core'

export const ledgerEntryTypeEnum = pgEnum('ledger_entry_type', [
  'debit',
  'credit',
])

export const ledgerAccountEnum = pgEnum('ledger_account', [
  'rider_wallet',
  'driver_payable',
  'platform_revenue',
  'platform_liability',
  'promo_expense',
  'refund_liability',
  'payout_clearing',
  'corporate_wallet',
])

// Insert-only — no updates, no deletes ever
export const ledgerEntries = pgTable('ledger_entries', {
  id: uuid('id').primaryKey(),
  // Each financial event produces exactly two rows (debit + credit)
  correlationId: uuid('correlation_id').notNull(), // groups the debit/credit pair
  type: ledgerEntryTypeEnum('type').notNull(),
  account: ledgerAccountEnum('account').notNull(),
  amountKobo: bigint('amount_kobo', { mode: 'number' }).notNull(),
  currency: text('currency').notNull().default('NGN'),
  description: text('description').notNull(),
  // Reference to the source event
  referenceId: uuid('reference_id').notNull(),
  referenceType: text('reference_type').notNull(), // trip | payout | refund | promo | topup
  actorId: uuid('actor_id'),
  metadata: text('metadata'), // JSON string
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
