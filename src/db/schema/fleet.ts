import { pgTable, uuid, text, timestamp, boolean, pgEnum } from 'drizzle-orm/pg-core'
import { users } from './identity.js'
import { vehicles } from './vehicles.js'
import { drivers } from './drivers.js'

export const fleetOwners = pgTable('fleet_owners', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull().unique().references(() => users.id),
  businessName: text('business_name'),
  isVerified: boolean('is_verified').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const fleetVehicles = pgTable('fleet_vehicles', {
  id: uuid('id').primaryKey(),
  fleetOwnerId: uuid('fleet_owner_id').notNull().references(() => fleetOwners.id),
  vehicleId: uuid('vehicle_id').notNull().unique().references(() => vehicles.id),
  isAvailableForAssignment: boolean('is_available_for_assignment').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const fleetAssignments = pgTable('fleet_assignments', {
  id: uuid('id').primaryKey(),
  fleetVehicleId: uuid('fleet_vehicle_id').notNull().references(() => fleetVehicles.id),
  driverId: uuid('driver_id').notNull().references(() => drivers.id),
  startDate: timestamp('start_date', { withTimezone: true }).notNull(),
  endDate: timestamp('end_date', { withTimezone: true }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
