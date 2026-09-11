import { z } from 'zod'

export const sosTriggerSchema = z.object({
  tripId: z.string().uuid().optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  description: z.string().max(500).optional(),
})

export const reportIncidentSchema = z.object({
  tripId: z.string().uuid().optional(),
  type: z.string().min(1).max(50),
  severity: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  description: z.string().max(1000).optional(),
})

export const updateIncidentStatusSchema = z.object({
  status: z.enum(['open', 'assigned', 'investigating', 'escalated', 'resolved', 'closed']),
  note: z.string().max(1000).optional(),
})

export const assignIncidentSchema = z.object({
  assignedTo: z.string().uuid(),
})

export type SOSBody = z.infer<typeof sosTriggerSchema>
export type ReportIncidentBody = z.infer<typeof reportIncidentSchema>
export type UpdateIncidentStatusBody = z.infer<typeof updateIncidentStatusSchema>
export type AssignIncidentBody = z.infer<typeof assignIncidentSchema>