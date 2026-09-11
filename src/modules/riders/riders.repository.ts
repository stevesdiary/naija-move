import { db } from '../../db/index.js'
import { riders, savedPlaces, emergencyContacts } from '../../db/schema/index.js'
import { eq, and, isNull, desc } from 'drizzle-orm'
import { v4 as uuid } from 'uuid'

export const ridersRepository = {
  async findByUserId(userId: string) {
    return db.query.riders.findFirst({
      where: and(eq(riders.userId, userId), isNull(riders.deletedAt)),
    })
  },

  async findById(id: string) {
    return db.query.riders.findFirst({
      where: and(eq(riders.id, id), isNull(riders.deletedAt)),
    })
  },

  async create(userId: string) {
    const id = uuid()
    await db.insert(riders).values({ id, userId })
    return this.findById(id)
  },

  async update(id: string, data: Partial<{ preferredPaymentMethod: string }>) {
    await db
      .update(riders)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(riders.id, id), isNull(riders.deletedAt)))
    return this.findById(id)
  },

  async softDelete(id: string) {
    await db.update(riders).set({ deletedAt: new Date() }).where(eq(riders.id, id))
  },

  // Saved Places — no deletedAt or updatedAt on this table
  async listSavedPlaces(riderId: string) {
    return db.query.savedPlaces.findMany({
      where: eq(savedPlaces.riderId, riderId),
      orderBy: [desc(savedPlaces.createdAt)],
    })
  },

  async createSavedPlace(riderId: string, data: {
    label: string
    name: string
    address: string
    lat: number
    lng: number
  }) {
    const id = uuid()
    await db.insert(savedPlaces).values({
      id,
      riderId,
      label: data.label,
      name: data.name,
      address: data.address,
      lat: data.lat,
      lng: data.lng,
    })
    return db.query.savedPlaces.findFirst({ where: eq(savedPlaces.id, id) })
  },

  async deleteSavedPlace(id: string, riderId: string) {
    await db
      .delete(savedPlaces)
      .where(and(eq(savedPlaces.id, id), eq(savedPlaces.riderId, riderId)))
  },

  // Emergency Contacts — no deletedAt or updatedAt on this table
  async listEmergencyContacts(riderId: string) {
    return db.query.emergencyContacts.findMany({
      where: eq(emergencyContacts.riderId, riderId),
      orderBy: [desc(emergencyContacts.createdAt)],
    })
  },

  async createEmergencyContact(riderId: string, data: {
    name: string
    phone: string
    shareTrips?: boolean
  }) {
    const id = uuid()
    await db.insert(emergencyContacts).values({
      id,
      riderId,
      name: data.name,
      phone: data.phone,
      shareTrips: data.shareTrips ?? false,
    })
    return db.query.emergencyContacts.findFirst({ where: eq(emergencyContacts.id, id) })
  },

  async deleteEmergencyContact(id: string, riderId: string) {
    await db
      .delete(emergencyContacts)
      .where(and(eq(emergencyContacts.id, id), eq(emergencyContacts.riderId, riderId)))
  },
}