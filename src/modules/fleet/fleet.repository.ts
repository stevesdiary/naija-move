import { db } from '../../db/index.js'
import { fleetOwners, fleetVehicles, fleetAssignments, users, vehicles, drivers } from '../../db/schema/index.js'
import { eq, and, isNull, desc } from 'drizzle-orm'
import { v4 as uuid } from 'uuid'

export const fleetRepository = {
  async createOwner(data: { userId: string; businessName?: string }) {
    const id = uuid()
    await db.insert(fleetOwners).values({ id, ...data })
    return this.findOwnerById(id)
  },

  async findOwnerById(id: string) {
    return db.query.fleetOwners.findFirst({ where: eq(fleetOwners.id, id) })
  },

  async findOwnerByUserId(userId: string) {
    return db.query.fleetOwners.findFirst({ where: eq(fleetOwners.userId, userId) })
  },

  async updateOwner(id: string, data: { businessName?: string; isVerified?: boolean }) {
    await db.update(fleetOwners).set({ ...data, updatedAt: new Date() }).where(eq(fleetOwners.id, id))
    return this.findOwnerById(id)
  },

  async listOwners(limit = 20, offset = 0) {
    return db.query.fleetOwners.findMany({
      orderBy: [desc(fleetOwners.createdAt)],
      limit,
      offset,
    })
  },

  // Fleet Vehicles
  async addVehicle(data: { fleetOwnerId: string; vehicleId: string }) {
    const id = uuid()
    await db.insert(fleetVehicles).values({ id, ...data })
    return db.query.fleetVehicles.findFirst({ where: eq(fleetVehicles.id, id) })
  },

  async findVehicleById(id: string) {
    return db.query.fleetVehicles.findFirst({ where: eq(fleetVehicles.id, id) })
  },

  async listVehicles(fleetOwnerId: string) {
    return db.query.fleetVehicles.findMany({
      where: eq(fleetVehicles.fleetOwnerId, fleetOwnerId),
      orderBy: [desc(fleetVehicles.createdAt)],
    })
  },

  async updateVehicleAvailability(id: string, isAvailableForAssignment: boolean) {
    await db.update(fleetVehicles).set({ isAvailableForAssignment } as any).where(eq(fleetVehicles.id, id))
    return this.findVehicleById(id)
  },

  async removeVehicle(id: string) {
    await db.delete(fleetVehicles).where(eq(fleetVehicles.id, id))
  },

  // Fleet Assignments
  async createAssignment(data: { fleetVehicleId: string; driverId: string; startDate: Date; endDate?: Date }) {
    const id = uuid()
    await db.insert(fleetAssignments).values({ id, ...data })
    return db.query.fleetAssignments.findFirst({ where: eq(fleetAssignments.id, id) })
  },

  async findAssignmentById(id: string) {
    return db.query.fleetAssignments.findFirst({ where: eq(fleetAssignments.id, id) })
  },

  async listAssignments(fleetOwnerId: string) {
    // Join through fleetVehicles to get assignments for a fleet owner
    const fleetVehicles_ = await db.query.fleetVehicles.findMany({
      where: eq(fleetVehicles.fleetOwnerId, fleetOwnerId),
    })
    const vehicleIds = fleetVehicles_.map(v => v.id)

    if (vehicleIds.length === 0) return []

    return db.query.fleetAssignments.findMany({
      where: (fleetAssignments, { inArray }) => inArray(fleetAssignments.fleetVehicleId, vehicleIds),
      orderBy: [desc(fleetAssignments.createdAt)],
    })
  },

  async updateAssignment(id: string, data: { endDate?: Date; isActive?: boolean }) {
    await db.update(fleetAssignments).set(data as any).where(eq(fleetAssignments.id, id))
    return this.findAssignmentById(id)
  },

  async endAssignment(id: string) {
    await db.update(fleetAssignments).set({ endDate: new Date(), isActive: false } as any).where(eq(fleetAssignments.id, id))
    return this.findAssignmentById(id)
  },
}