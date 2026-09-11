import { pgTable, uuid, text, timestamp, boolean, bigint, integer, real, pgEnum } from 'drizzle-orm/pg-core'

export const promoTypeEnum = pgEnum('promo_type', [
  'flat_discount',
  'percent_discount',
  'free_ride',
  'cashback',
])

export const promoTargetEnum = pgEnum('promo_target', [
  'rider',
  'driver',
  'both',
])

export const promotions = pgTable('promotions', {
  id: uuid('id').primaryKey(),
  code: text('code').notNull().unique(),
  type: promoTypeEnum('type').notNull(),
  target: promoTargetEnum('target').notNull().default('rider'),
  valueKobo: bigint('value_kobo', { mode: 'number' }), // flat discount amount
  valuePercent: real('value_percent'), // percent discount
  maxDiscountKobo: bigint('max_discount_kobo', { mode: 'number' }), // cap for percent promos
  budgetKobo: bigint('budget_kobo', { mode: 'number' }).notNull(),
  spentKobo: bigint('spent_kobo', { mode: 'number' }).notNull().default(0),
  maxRedemptions: integer('max_redemptions'),
  redemptionCount: integer('redemption_count').notNull().default(0),
  maxPerUser: integer('max_per_user').notNull().default(1),
  isActive: boolean('is_active').notNull().default(true),
  startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
  endsAt: timestamp('ends_at', { withTimezone: true }),
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const promoRedemptions = pgTable('promo_redemptions', {
  id: uuid('id').primaryKey(),
  promotionId: uuid('promotion_id').notNull().references(() => promotions.id),
  userId: uuid('user_id').notNull(),
  tripId: uuid('trip_id'),
  discountKobo: bigint('discount_kobo', { mode: 'number' }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const referrals = pgTable('referrals', {
  id: uuid('id').primaryKey(),
  referrerId: uuid('referrer_id').notNull(),
  referredId: uuid('referred_id').notNull(),
  code: text('code').notNull(),
  rewardKobo: bigint('reward_kobo', { mode: 'number' }),
  rewardedAt: timestamp('rewarded_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
