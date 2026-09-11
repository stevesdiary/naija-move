import type { FastifyInstance } from 'fastify'
import { authenticate, authorize } from '../../lib/rbac.js'
import {
  sendNotificationSchema,
  bulkNotificationSchema,
  createTemplateSchema,
  type SendNotificationBody,
  type BulkNotificationBody,
  type CreateTemplateBody,
} from './notifications.schema.js'
import { notificationsService } from './notifications.service.js'

export async function notificationRoutes(app: FastifyInstance) {
  // Send single notification (admin)
  app.post<{ Body: SendNotificationBody }>('/send', { preHandler: [authenticate, authorize('admin')] }, async (req) => {
    const body = sendNotificationSchema.parse(req.body)
    return notificationsService.sendNotification(body)
  })

  // Send bulk notification (admin)
  app.post<{ Body: BulkNotificationBody }>('/send/bulk', { preHandler: [authenticate, authorize('admin')] }, async (req) => {
    const body = bulkNotificationSchema.parse(req.body)
    return notificationsService.sendBulk(body)
  })

  // Get templates (admin)
  app.get('/templates', { preHandler: [authenticate, authorize('admin')] }, async (req) => {
    const { channel, locale } = req.query as { channel?: string; locale?: string }
    return notificationsService.getTemplates(channel, locale)
  })

  // Create template (admin)
  app.post<{ Body: CreateTemplateBody }>('/templates', { preHandler: [authenticate, authorize('admin')] }, async (req) => {
    const body = createTemplateSchema.parse(req.body)
    return notificationsService.createTemplate(body)
  })

  // Update template (admin)
  app.put<{ Body: { subject?: string; body?: string; isActive?: boolean }; Params: { templateId: string } }>(
    '/templates/:templateId',
    { preHandler: [authenticate, authorize('admin')] },
    async (req) => {
      const { templateId } = req.params
      return notificationsService.updateTemplate(templateId, req.body)
    },
  )

  // Get user's notification history
  app.get('/my', { preHandler: [authenticate] }, async (req) => {
    const { limit, offset } = req.query as { limit?: string; offset?: string }
    return notificationsService.getUserNotifications(req.user.sub, limit ? parseInt(limit) : 50, offset ? parseInt(offset) : 0)
  })
}