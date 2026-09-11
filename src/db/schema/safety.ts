import { pgTable, uuid, text, timestamp, pgEnum } from 'drizzle-orm/pg-core'
import { trips } from './rides.js'

export const incidentSeverityEnum = pgEnum('incident_severity', [
  'low',
  'medium',
  'high',
  'critical',
])

export const incidentStatusEnum = pgEnum('incident_status', [
  'open',
  'assigned',
  'investigating',
  'escalated',
  'resolved',
  'closed',
])

export const safetyIncidents = pgTable('safety_incidents', {
  id: uuid('id').primaryKey(),
  tripId: uuid('trip_id').references(() => trips.id),
  reportedBy: uuid('reported_by').notNull(),
  reporterType: text('reporter_type').notNull(), // rider | driver | system | agent
  severity: incidentSeverityEnum('severity').notNull().default('medium'),
  status: incidentStatusEnum('status').notNull().default('open'),
  type: text('type').notNull(), // sos | route_deviation | complaint | accident | fraud
  description: text('description'),
  assignedTo: uuid('assigned_to'),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  resolutionNote: text('resolution_note'),
  externalRef: text('external_ref'), // police report number etc.
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const incidentEvents = pgTable('incident_events', {
  id: uuid('id').primaryKey(),
  incidentId: uuid('incident_id').notNull().references(() => safetyIncidents.id),
  event: text('event').notNull(),
  actorId: uuid('actor_id'),
  actorType: text('actor_type'),
  note: text('note'),
  metadata: text('metadata'), // JSON string
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
