import { notificationsRepository } from './notifications.repository.js'
import { sms } from '../../providers/sms.js'
import { errors } from '../../lib/errors.js'

export const notificationsService = {
  async sendNotification(params: {
    userId: string
    templateKey: string
    channel: 'sms' | 'push' | 'whatsapp' | 'email'
    locale?: string
    variables?: Record<string, unknown>
    recipient?: string
  }) {
    const template = await notificationsRepository.findTemplate(
      params.templateKey,
      params.channel,
      params.locale ?? 'en'
    )

    if (!template) {
      throw errors.notFound(`Template not found: ${params.templateKey} (${params.channel})`)
    }

    // Convert variables to string record for interpolation
    const stringVars: Record<string, string> = {}
    if (params.variables) {
      for (const [key, value] of Object.entries(params.variables)) {
        stringVars[key] = String(value)
      }
    }

    const body = notificationsRepository.interpolate(template.body, stringVars)
    const recipient = params.recipient

    // Log notification attempt
    const log = await notificationsRepository.logNotification({
      userId: params.userId,
      templateId: template.id,
      channel: params.channel,
      recipient: recipient ?? 'unknown',
      body,
    })

    if (!log) {
      throw errors.internal('Failed to log notification')
    }

    // Dispatch based on channel
    try {
      switch (params.channel) {
        case 'sms':
          if (recipient) {
            await sms.sendMessage(recipient, body)
          }
          await notificationsRepository.updateLogStatus(log.id, 'sent')
          break
        case 'push':
          console.log(`[PUSH] to ${recipient}: ${body}`)
          await notificationsRepository.updateLogStatus(log.id, 'sent')
          break
        case 'email':
          console.log(`[EMAIL] to ${recipient}: ${template.subject} - ${body}`)
          await notificationsRepository.updateLogStatus(log.id, 'sent')
          break
        case 'whatsapp':
          console.log(`[WHATSAPP] to ${recipient}: ${body}`)
          await notificationsRepository.updateLogStatus(log.id, 'sent')
          break
      }

      return { sent: true, logId: log.id }
    } catch (error) {
      await notificationsRepository.updateLogStatus(log.id, 'failed', undefined, error instanceof Error ? error.message : 'Unknown error')
      throw error
    }
  },

  async sendBulk(params: {
    userIds: string[]
    templateKey: string
    channel: 'sms' | 'push' | 'whatsapp' | 'email'
    locale?: string
    variables?: Record<string, unknown>
  }) {
    const results = []
    for (const userId of params.userIds) {
      try {
        const result = await this.sendNotification({
          userId,
          templateKey: params.templateKey,
          channel: params.channel,
          locale: params.locale,
          variables: params.variables,
        })
        results.push({ userId, success: true, logId: result.logId })
      } catch (error) {
        results.push({ userId, success: false, error: error instanceof Error ? error.message : 'Unknown error' })
      }
    }
    return results
  },

  async getTemplates(channel?: string, locale?: string) {
    return notificationsRepository.listTemplates(channel, locale)
  },

  async createTemplate(data: { key: string; channel: string; locale?: string; subject?: string; body: string }) {
    return notificationsRepository.createTemplate(data)
  },

  async updateTemplate(id: string, data: { subject?: string; body?: string; isActive?: boolean }) {
    return notificationsRepository.updateTemplate(id, data)
  },

  async getUserNotifications(userId: string, limit = 50, offset = 0) {
    return notificationsRepository.getUserNotifications(userId, limit, offset)
  },
}