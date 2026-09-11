import { pgTable, uuid, text, timestamp, boolean, bigint } from 'drizzle-orm/pg-core'
import { users } from './identity.js'
import { trips } from './rides.js'

export const corporateAccounts = pgTable('corporate_accounts', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  phone: text('phone'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const corporateMembers = pgTable('corporate_members', {
  id: uuid('id').primaryKey(),
  corporateAccountId: uuid('corporate_account_id').notNull().references(() => corporateAccounts.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  role: text('role').notNull().default('employee'), // employee | admin
  monthlyBudgetKobo: bigint('monthly_budget_kobo', { mode: 'number' }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const corporateWallets = pgTable('corporate_wallets', {
  id: uuid('id').primaryKey(),
  corporateAccountId: uuid('corporate_account_id').notNull().unique().references(() => corporateAccounts.id),
  currency: text('currency').notNull().default('NGN'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const corporateTrips = pgTable('corporate_trips', {
  id: uuid('id').primaryKey(),
  tripId: uuid('trip_id').notNull().unique().references(() => trips.id),
  corporateAccountId: uuid('corporate_account_id').notNull().references(() => corporateAccounts.id),
  memberId: uuid('member_id').notNull().references(() => corporateMembers.id),
  costCentre: text('cost_centre'),
  approvedBy: uuid('approved_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
