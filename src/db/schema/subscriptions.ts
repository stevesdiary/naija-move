import { pgTable, uuid, text, timestamp, boolean, real, bigint, pgEnum } from 'drizzle-orm/pg-core'
import { drivers } from './drivers.js'

export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'active',
  'cancelled',
  'expired',
  'past_due',
])

export const driverPlans = pgTable('driver_plans', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  platformFeePercent: real('platform_fee_percent').notNull(),
  weeklyFeeKobo: bigint('weekly_fee_kobo', { mode: 'number' }).notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const driverSubscriptions = pgTable('driver_subscriptions', {
  id: uuid('id').primaryKey(),
  driverId: uuid('driver_id').notNull().references(() => drivers.id),
  planId: uuid('plan_id').notNull().references(() => driverPlans.id),
  status: subscriptionStatusEnum('status').notNull().default('active'),
  currentPeriodStart: timestamp('current_period_start', { withTimezone: true }).notNull(),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }).notNull(),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
