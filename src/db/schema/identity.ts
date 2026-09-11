import { pgTable, uuid, text, timestamp, boolean, pgEnum, integer } from 'drizzle-orm/pg-core'

export const userRoleEnum = pgEnum('user_role', [
  'rider',
  'driver',
  'admin',
  'fleet_owner',
  'corporate_admin',
])

export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  phone: text('phone').notNull().unique(),
  email: text('email').unique(),
  name: text('name'),
  avatarUrl: text('avatar_url'),
  role: userRoleEnum('role').notNull().default('rider'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
})

export const otpRequests = pgTable('otp_requests', {
  id: uuid('id').primaryKey(),
  phone: text('phone').notNull(),
  code: text('code').notNull(),
  attempts: integer('attempts').notNull().default(0),
  verified: boolean('verified').notNull().default(false),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  sessionId: text('session_id').notNull().unique(),
  token: text('token').notNull(),
  deviceId: text('device_id'),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const devices = pgTable('devices', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  deviceToken: text('device_token').notNull(),
  platform: text('platform').notNull(), // ios | android
  pushToken: text('push_token'),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
