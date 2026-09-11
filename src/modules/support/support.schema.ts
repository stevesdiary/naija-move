import { z } from 'zod'

export const createCaseSchema = z.object({
  referenceId: z.string().uuid().optional(),
  referenceType: z.string().max(50).optional(),
  category: z.enum(['trip', 'payment', 'safety', 'driver', 'vehicle', 'account', 'other']),
  subject: z.string().min(1).max(200),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  initialMessage: z.string().min(1).max(2000),
})

export const addMessageSchema = z.object({
  body: z.string().min(1).max(2000),
  isInternal: z.boolean().default(false),
})

export const updateCaseStatusSchema = z.object({
  status: z.enum(['open', 'pending_user', 'pending_agent', 'escalated', 'resolved', 'closed']),
})

export const assignCaseSchema = z.object({
  assignedTo: z.string().uuid(),
})

export type CreateCaseBody = z.infer<typeof createCaseSchema>
export type AddMessageBody = z.infer<typeof addMessageSchema>
export type UpdateCaseStatusBody = z.infer<typeof updateCaseStatusSchema>
export type AssignCaseBody = z.infer<typeof assignCaseSchema>