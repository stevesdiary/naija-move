import { db } from '../../db/index.js'
import { safetyIncidents, incidentEvents } from '../../db/schema/index.js'
import { eq, and, desc } from 'drizzle-orm'
import { v4 as uuid } from 'uuid'
import { errors } from '../../lib/errors.js'

export const safetyRepository = {
  async createIncident(data: {
    tripId?: string
    reportedBy: string
    reporterType: string
    severity: 'low' | 'medium' | 'high' | 'critical'
    type: string
    description?: string
    assignedTo?: string
  }) {
    const id = uuid()
    await db.insert(safetyIncidents).values({
      id,
      tripId: data.tripId,
      reportedBy: data.reportedBy,
      reporterType: data.reporterType,
      severity: data.severity,
      type: data.type,
      description: data.description,
      assignedTo: data.assignedTo,
    })
    await this.logEvent(id, 'created', data.reportedBy, data.reporterType, { type: data.type, severity: data.severity })
    const incident = await this.findIncidentById(id)
    if (!incident) throw errors.internal('Failed to create safety incident')
    return incident
  },

  async findIncidentById(id: string) {
    return db.query.safetyIncidents.findFirst({ where: eq(safetyIncidents.id, id) })
  },

  async updateStatus(id: string, status: string, actorId?: string, actorType?: string, note?: string) {
    const updates: Record<string, any> = { status: status as any, updatedAt: new Date() }
    if (status === 'resolved' || status === 'closed') {
      updates.resolvedAt = new Date()
      if (note) updates.resolutionNote = note
    }
    await db.update(safetyIncidents).set(updates).where(eq(safetyIncidents.id, id))
    if (actorId) await this.logEvent(id, `status_${status}`, actorId, actorType!, { note })
    return this.findIncidentById(id)
  },

  async assignIncident(id: string, assignedTo: string, actorId: string) {
    await db.update(safetyIncidents).set({ assignedTo, updatedAt: new Date() }).where(eq(safetyIncidents.id, id))
    await this.logEvent(id, 'assigned', actorId, 'agent', { assignedTo })
    return this.findIncidentById(id)
  },

  async listIncidents(filters?: {
    status?: string
    severity?: string
    reportedBy?: string
    tripId?: string
    limit?: number
    offset?: number
  }) {
    const conditions = []
    if (filters?.status) conditions.push(eq(safetyIncidents.status, filters.status as any))
    if (filters?.severity) conditions.push(eq(safetyIncidents.severity, filters.severity as any))
    if (filters?.reportedBy) conditions.push(eq(safetyIncidents.reportedBy, filters.reportedBy))
    if (filters?.tripId) conditions.push(eq(safetyIncidents.tripId, filters.tripId))

    return db.query.safetyIncidents.findMany({
      where: conditions.length ? and(...conditions) : undefined,
      orderBy: [desc(safetyIncidents.createdAt)],
      limit: filters?.limit ?? 50,
      offset: filters?.offset ?? 0,
    })
  },

  async logEvent(incidentId: string, event: string, actorId?: string, actorType?: string, metadata?: Record<string, unknown>, note?: string) {
    await db.insert(incidentEvents).values({
      id: uuid(),
      incidentId,
      event,
      actorId,
      actorType,
      note,
      metadata: metadata ? JSON.stringify(metadata) : null,
    })
  },

  async getEvents(incidentId: string) {
    return db.query.incidentEvents.findMany({
      where: eq(incidentEvents.incidentId, incidentId),
      orderBy: [desc(incidentEvents.createdAt)],
    })
  },
}