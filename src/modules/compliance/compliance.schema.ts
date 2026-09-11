import { z } from 'zod'

export const createComplianceItemSchema = z.object({
  entityId: z.string().uuid(),
  entityType: z.enum(['driver', 'vehicle']),
  jurisdiction: z.string().min(1).max(50).default('lagos'),
  itemType: z.enum(['drivers_licence', 'insurance', 'inspection', 'background_check']),
  blocksActivation: z.boolean().default(true),
  expiresAt: z.string().datetime().optional(),
})

export const updateComplianceItemSchema = z.object({
  status: z.enum(['pending', 'compliant', 'expiring_soon', 'expired', 'blocked']),
  note: z.string().max(500).optional(),
})

export type CreateComplianceItemBody = z.infer<typeof createComplianceItemSchema>
export type UpdateComplianceItemBody = z.infer<typeof updateComplianceItemSchema>