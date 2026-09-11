import { pgTable, uuid, text, timestamp, boolean, pgEnum } from 'drizzle-orm/pg-core'

export const complianceStatusEnum = pgEnum('compliance_status', [
  'pending',
  'compliant',
  'expiring_soon',
  'expired',
  'blocked',
])

// Registry of what compliance items are required per jurisdiction
export const complianceItems = pgTable('compliance_items', {
  id: uuid('id').primaryKey(),
  entityId: uuid('entity_id').notNull(), // driverId or vehicleId
  entityType: text('entity_type').notNull(), // driver | vehicle
  jurisdiction: text('jurisdiction').notNull().default('lagos'),
  itemType: text('item_type').notNull(), // drivers_licence | insurance | inspection | background_check
  status: complianceStatusEnum('status').notNull().default('pending'),
  blocksActivation: boolean('blocks_activation').notNull().default(true),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  lastCheckedAt: timestamp('last_checked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const complianceEvents = pgTable('compliance_events', {
  id: uuid('id').primaryKey(),
  complianceItemId: uuid('compliance_item_id').notNull().references(() => complianceItems.id),
  fromStatus: complianceStatusEnum('from_status'),
  toStatus: complianceStatusEnum('to_status').notNull(),
  triggeredBy: text('triggered_by').notNull(), // system | admin | driver
  actorId: uuid('actor_id'),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
