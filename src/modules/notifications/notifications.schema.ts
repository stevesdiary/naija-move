import { z } from 'zod'

export const sendNotificationSchema = z.object({
  userId: z.string().uuid(),
  templateKey: z.string().min(1).max(100),
  channel: z.enum(['sms', 'push', 'whatsapp', 'email']),
  locale: z.string().min(2).max(10).default('en'),
  variables: z.record(z.string(), z.string()).optional(),
  recipient: z.string().optional(),
})

export const bulkNotificationSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1).max(1000),
  templateKey: z.string().min(1).max(100),
  channel: z.enum(['sms', 'push', 'whatsapp', 'email']),
  locale: z.string().min(2).max(10).default('en'),
  variables: z.record(z.string(), z.string()).optional(),
})

export const createTemplateSchema = z.object({
  key: z.string().min(1).max(100),
  channel: z.enum(['sms', 'push', 'whatsapp', 'email']),
  locale: z.string().min(2).max(10).default('en'),
  subject: z.string().max(200).optional(),
  body: z.string().min(1).max(2000),
})

export type SendNotificationBody = z.infer<typeof sendNotificationSchema>
export type BulkNotificationBody = z.infer<typeof bulkNotificationSchema>
export type CreateTemplateBody = z.infer<typeof createTemplateSchema>