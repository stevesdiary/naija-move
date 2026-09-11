import { pgTable, uuid, text, timestamp, pgEnum } from 'drizzle-orm/pg-core'

export const caseStatusEnum = pgEnum('case_status', [
  'open',
  'pending_user',
  'pending_agent',
  'escalated',
  'resolved',
  'closed',
])

export const casePriorityEnum = pgEnum('case_priority', [
  'low',
  'normal',
  'high',
  'urgent',
])

export const supportCases = pgTable('support_cases', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull(),
  userType: text('user_type').notNull(), // rider | driver | corporate | fleet_owner
  referenceId: uuid('reference_id'), // tripId, paymentId, etc.
  referenceType: text('reference_type'),
  category: text('category').notNull(), // trip | payment | safety | driver | vehicle | account
  subject: text('subject').notNull(),
  status: caseStatusEnum('status').notNull().default('open'),
  priority: casePriorityEnum('priority').notNull().default('normal'),
  assignedTo: uuid('assigned_to'),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const caseMessages = pgTable('case_messages', {
  id: uuid('id').primaryKey(),
  caseId: uuid('case_id').notNull().references(() => supportCases.id),
  authorId: uuid('author_id').notNull(),
  authorType: text('author_type').notNull(), // user | agent | system
  body: text('body').notNull(),
  isInternal: text('is_internal').notNull().default('false'), // internal notes not shown to user
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const caseEvents = pgTable('case_events', {
  id: uuid('id').primaryKey(),
  caseId: uuid('case_id').notNull().references(() => supportCases.id),
  event: text('event').notNull(),
  actorId: uuid('actor_id'),
  actorType: text('actor_type'),
  metadata: text('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
