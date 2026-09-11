import { db } from '../../db/index.js'
import { notificationTemplates, notificationLog } from '../../db/schema/index.js'
import { eq, and, desc } from 'drizzle-orm'
import { v4 as uuid } from 'uuid'

export const notificationsRepository = {
  // Templates
  async findTemplate(key: string, channel: string, locale = 'en') {
    return db.query.notificationTemplates.findFirst({
      where: and(
        eq(notificationTemplates.key, key),
        eq(notificationTemplates.channel, channel as any),
        eq(notificationTemplates.locale, locale),
        eq(notificationTemplates.isActive, true),
      ),
    })
  },

  async createTemplate(data: {
    key: string
    channel: string
    locale?: string
    subject?: string
    body: string
  }) {
    const id = uuid()
    await db.insert(notificationTemplates).values({
      id,
      key: data.key,
      channel: data.channel as any,
      locale: data.locale ?? 'en',
      subject: data.subject,
      body: data.body,
    })
    return db.query.notificationTemplates.findFirst({ where: eq(notificationTemplates.id, id) })
  },

  async listTemplates(channel?: string, locale?: string) {
    const conditions = [eq(notificationTemplates.isActive, true)]
    if (channel) conditions.push(eq(notificationTemplates.channel, channel as any))
    if (locale) conditions.push(eq(notificationTemplates.locale, locale))

    return db.query.notificationTemplates.findMany({
      where: and(...conditions),
      orderBy: [desc(notificationTemplates.createdAt)],
    })
  },

  async updateTemplate(id: string, data: { subject?: string; body?: string; isActive?: boolean }) {
    await db.update(notificationTemplates).set({ ...data, updatedAt: new Date() }).where(eq(notificationTemplates.id, id))
    return db.query.notificationTemplates.findFirst({ where: eq(notificationTemplates.id, id) })
  },

  // Notification Log
  async logNotification(data: {
    userId: string
    templateId?: string
    channel: string
    recipient: string
    body: string
    providerRef?: string
  }) {
    const id = uuid()
    await db.insert(notificationLog).values({
      id,
      userId: data.userId,
      templateId: data.templateId,
      channel: data.channel as any,
      recipient: data.recipient,
      body: data.body,
      providerRef: data.providerRef,
    })
    return db.query.notificationLog.findFirst({ where: eq(notificationLog.id, id) })
  },

  async updateLogStatus(id: string, status: string, providerRef?: string, failureReason?: string) {
    const updates: Record<string, any> = { status: status as any }
    if (status === 'sent') updates.sentAt = new Date()
    if (status === 'delivered') updates.deliveredAt = new Date()
    if (providerRef) updates.providerRef = providerRef
    if (failureReason) updates.failureReason = failureReason

    await db.update(notificationLog).set(updates).where(eq(notificationLog.id, id))
    return db.query.notificationLog.findFirst({ where: eq(notificationLog.id, id) })
  },

  async getUserNotifications(userId: string, limit = 50, offset = 0) {
    return db.query.notificationLog.findMany({
      where: eq(notificationLog.userId, userId),
      orderBy: [desc(notificationLog.createdAt)],
      limit,
      offset,
    })
  },

  interpolate(template: string, variables: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => variables[key] ?? match)
  },
}