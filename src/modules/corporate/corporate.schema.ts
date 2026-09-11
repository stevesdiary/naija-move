import { z } from 'zod'

export const createAccountSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z.string().regex(/^\+234[0-9]{10}$/).optional(),
})

export const updateAccountSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().regex(/^\+234[0-9]{10}$/).optional(),
  isActive: z.boolean().optional(),
})

export const addMemberSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['employee', 'admin']).default('employee'),
  monthlyBudgetKobo: z.number().int().nonnegative().optional(),
})

export const updateMemberSchema = z.object({
  role: z.enum(['employee', 'admin']).optional(),
  monthlyBudgetKobo: z.number().int().nonnegative().optional(),
  isActive: z.boolean().optional(),
})

export const linkTripSchema = z.object({
  tripId: z.string().uuid(),
  memberId: z.string().uuid(),
  costCentre: z.string().max(50).optional(),
  approvedBy: z.string().uuid().optional(),
})

export type CreateAccountBody = z.infer<typeof createAccountSchema>
export type UpdateAccountBody = z.infer<typeof updateAccountSchema>
export type AddMemberBody = z.infer<typeof addMemberSchema>
export type UpdateMemberBody = z.infer<typeof updateMemberSchema>
export type LinkTripBody = z.infer<typeof linkTripSchema>