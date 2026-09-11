import { pgTable, uuid, text, timestamp, boolean, integer, pgEnum } from 'drizzle-orm/pg-core'
import { drivers } from './drivers.js'

export const vehicleCategoryEnum = pgEnum('vehicle_category', [
  'economy',
  'comfort',
  'premium',
  'xl',
])

export const vehicles = pgTable('vehicles', {
  id: uuid('id').primaryKey(),
  driverId: uuid('driver_id').notNull().references(() => drivers.id),
  plate: text('plate').notNull().unique(),
  make: text('make').notNull(),
  model: text('model').notNull(),
  year: integer('year').notNull(),
  color: text('color').notNull(),
  category: vehicleCategoryEnum('category').notNull().default('economy'),
  seats: integer('seats').notNull().default(4),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const vehicleInspections = pgTable('vehicle_inspections', {
  id: uuid('id').primaryKey(),
  vehicleId: uuid('vehicle_id').notNull().references(() => vehicles.id),
  status: text('status').notNull(), // passed | failed | pending
  result: text('result'),
  inspectedAt: timestamp('inspected_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const vehicleInsurance = pgTable('vehicle_insurance', {
  id: uuid('id').primaryKey(),
  vehicleId: uuid('vehicle_id').notNull().references(() => vehicles.id),
  policyNumber: text('policy_number').notNull(),
  provider: text('provider').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  documentUrl: text('document_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
