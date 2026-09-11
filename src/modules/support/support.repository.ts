import { db } from '../../db/index.js'
import { supportCases, caseMessages, caseEvents } from '../../db/schema/index.js'
import { eq, and, desc } from 'drizzle-orm'
import { v4 as uuid } from 'uuid'
import { errors } from '../../lib/errors.js'

export const supportRepository = {
  async createCase(data: {
    userId: string
    userType: string
    referenceId?: string
    referenceType?: string
    category: string
    subject: string
    priority?: string
  }) {
    const id = uuid()
    await db.insert(supportCases).values({
      id,
      userId: data.userId,
      userType: data.userType,
      referenceId: data.referenceId,
      referenceType: data.referenceType,
      category: data.category,
      subject: data.subject,
      priority: (data.priority as any) ?? 'normal',
    })
    await this.logEvent(id, 'created', data.userId, data.userType, { category: data.category, priority: data.priority })
    const case_ = await this.findCaseById(id)
    if (!case_) throw errors.internal('Failed to create support case')
    return case_
  },

  async findCaseById(id: string) {
    return db.query.supportCases.findFirst({ where: eq(supportCases.id, id) })
  },

  async updateCaseStatus(id: string, status: string, actorId?: string, actorType?: string) {
    const updates: Record<string, any> = { status: status as any, updatedAt: new Date() }
    if (status === 'resolved' || status === 'closed') {
      updates.resolvedAt = new Date()
    }
    await db.update(supportCases).set(updates).where(eq(supportCases.id, id))
    if (actorId) await this.logEvent(id, `status_${status}`, actorId, actorType!)
    return this.findCaseById(id)
  },

  async assignCase(id: string, assignedTo: string, actorId: string) {
    await db.update(supportCases).set({ assignedTo, updatedAt: new Date() }).where(eq(supportCases.id, id))
    await this.logEvent(id, 'assigned', actorId, 'agent', { assignedTo })
    return this.findCaseById(id)
  },

  async addMessage(caseId: string, data: {
    authorId: string
    authorType: 'user' | 'agent' | 'system'
    body: string
    isInternal?: boolean
  }) {
    const id = uuid()
    await db.insert(caseMessages).values({
      id,
      caseId,
      authorId: data.authorId,
      authorType: data.authorType,
      body: data.body,
      isInternal: (data.isInternal ? 'true' : 'false') as any,
    })
    await this.logEvent(caseId, 'message_added', data.authorId, data.authorType, { messageId: id })
    return db.query.caseMessages.findFirst({ where: eq(caseMessages.id, id) })
  },

  async getMessages(caseId: string, includeInternal = false) {
    const conditions = [eq(caseMessages.caseId, caseId)]
    if (!includeInternal) {
      conditions.push(eq(caseMessages.isInternal, 'false' as any))
    }
    return db.query.caseMessages.findMany({
      where: and(...conditions),
      orderBy: (caseMessages, { asc }) => [asc(caseMessages.createdAt)],
    })
  },

  async listCases(filters?: {
    userId?: string
    status?: string
    category?: string
    priority?: string
    assignedTo?: string
    limit?: number
    offset?: number
  }) {
    const conditions = []
    if (filters?.userId) conditions.push(eq(supportCases.userId, filters.userId))
    if (filters?.status) conditions.push(eq(supportCases.status, filters.status as any))
    if (filters?.category) conditions.push(eq(supportCases.category, filters.category))
    if (filters?.priority) conditions.push(eq(supportCases.priority, filters.priority as any))
    if (filters?.assignedTo) conditions.push(eq(supportCases.assignedTo, filters.assignedTo))

    return db.query.supportCases.findMany({
      where: conditions.length ? and(...conditions) : undefined,
      orderBy: [desc(supportCases.createdAt)],
      limit: filters?.limit ?? 50,
      offset: filters?.offset ?? 0,
    })
  },

  async logEvent(caseId: string, event: string, actorId?: string, actorType?: string, metadata?: Record<string, unknown>) {
    await db.insert(caseEvents).values({
      id: uuid(),
      caseId,
      event,
      actorId,
      actorType,
      metadata: metadata ? JSON.stringify(metadata) : null,
    })
  },

  async getEvents(caseId: string) {
    return db.query.caseEvents.findMany({
      where: eq(caseEvents.caseId, caseId),
      orderBy: [desc(caseEvents.createdAt)],
    })
  },
}