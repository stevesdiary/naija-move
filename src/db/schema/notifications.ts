import { pgTable, uuid, text, timestamp, boolean, pgEnum } from 'drizzle-orm/pg-core'

export const notificationChannelEnum = pgEnum('notification_channel', [
  'sms',
  'push',
  'whatsapp',
  'email',
])

export const notificationStatusEnum = pgEnum('notification_status', [
  'pending',
  'sent',
  'delivered',
  'failed',
])

export const notificationTemplates = pgTable('notification_templates', {
  id: uuid('id').primaryKey(),
  key: text('key').notNull().unique(), // e.g. otp_request, driver_arrived, trip_completed
  channel: notificationChannelEnum('channel').notNull(),
  locale: text('locale').notNull().default('en'),
  subject: text('subject'),
  body: text('body').notNull(), // supports {{variable}} interpolation
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const notificationLog = pgTable('notification_log', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull(),
  templateId: uuid('template_id').references(() => notificationTemplates.id),
  channel: notificationChannelEnum('channel').notNull(),
  recipient: text('recipient').notNull(), // phone or push token
  body: text('body').notNull(),
  status: notificationStatusEnum('status').notNull().default('pending'),
  providerRef: text('provider_ref'),
  failureReason: text('failure_reason'),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  deliveredAt: timestamp('delivered_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
