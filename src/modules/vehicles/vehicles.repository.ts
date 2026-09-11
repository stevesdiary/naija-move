import { db } from '../../db/index.js'
import { vehicles, vehicleInspections, vehicleInsurance, drivers } from '../../db/schema/index.js'
import { eq, and, isNull, desc } from 'drizzle-orm'
import { v4 as uuid } from 'uuid'

export const vehiclesRepository = {
  async findByDriverId(driverId: string) {
    return db.query.vehicles.findMany({
      where: eq(vehicles.driverId, driverId),
      orderBy: [desc(vehicles.createdAt)],
    })
  },

  async findById(id: string) {
    return db.query.vehicles.findFirst({
      where: eq(vehicles.id, id),
    })
  },

  async create(driverId: string, data: {
    plate: string
    make: string
    model: string
    year: number
    color: string
    category: 'economy' | 'comfort' | 'premium' | 'xl'
    seats: number
  }) {
    const id = uuid()
    await db.insert(vehicles).values({
      id,
      driverId,
      plate: data.plate,
      make: data.make,
      model: data.model,
      year: data.year,
      color: data.color,
      category: data.category,
      seats: data.seats,
    })
    return this.findById(id)
  },

  async update(id: string, driverId: string, data: Partial<{
    make: string
    model: string
    year: number
    color: string
    plate: string
    category: 'economy' | 'comfort' | 'premium' | 'xl'
    seats: number
    isActive: boolean
  }>) {
    await db
      .update(vehicles)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(vehicles.id, id), eq(vehicles.driverId, driverId)))
    return this.findById(id)
  },

  async delete(id: string, driverId: string) {
    await db
      .delete(vehicles)
      .where(and(eq(vehicles.id, id), eq(vehicles.driverId, driverId)))
  },

  // Inspections — no deletedAt on this table
  async listInspections(vehicleId: string) {
    return db.query.vehicleInspections.findMany({
      where: eq(vehicleInspections.vehicleId, vehicleId),
      orderBy: [desc(vehicleInspections.createdAt)],
    })
  },

  async createInspection(vehicleId: string, data: { status: string; result?: string; inspectedAt?: Date; expiresAt?: Date }) {
    const id = uuid()
    await db.insert(vehicleInspections).values({
      id,
      vehicleId,
      status: data.status,
      result: data.result,
      inspectedAt: data.inspectedAt,
      expiresAt: data.expiresAt,
    })
    return db.query.vehicleInspections.findFirst({ where: eq(vehicleInspections.id, id) })
  },

  // Insurance — no deletedAt on this table
  async listInsurance(vehicleId: string) {
    return db.query.vehicleInsurance.findMany({
      where: eq(vehicleInsurance.vehicleId, vehicleId),
      orderBy: [desc(vehicleInsurance.createdAt)],
    })
  },

  async createInsurance(vehicleId: string, data: { provider: string; policyNumber: string; expiresAt: Date; documentUrl?: string }) {
    const id = uuid()
    await db.insert(vehicleInsurance).values({
      id,
      vehicleId,
      provider: data.provider,
      policyNumber: data.policyNumber,
      expiresAt: data.expiresAt,
      documentUrl: data.documentUrl,
    })
    return db.query.vehicleInsurance.findFirst({ where: eq(vehicleInsurance.id, id) })
  },
}