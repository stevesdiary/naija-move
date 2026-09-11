import { z } from 'zod'

export const vehicleRegisterSchema = z.object({
  plate: z.string().min(1).max(20),
  make: z.string().min(1).max(50),
  model: z.string().min(1).max(50),
  year: z.number().int().min(1990).max(new Date().getFullYear() + 1),
  color: z.string().min(1).max(30),
  category: z.enum(['economy', 'comfort', 'premium', 'xl']),
  seats: z.number().int().min(1).max(20),
})

export const updateVehicleSchema = vehicleRegisterSchema.partial().extend({
  isActive: z.boolean().optional(),
})

export const inspectionSchema = z.object({
  status: z.enum(['passed', 'failed', 'pending']),
  result: z.string().optional(),
  inspectedAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
})

export const insuranceSchema = z.object({
  provider: z.string().min(1).max(100),
  policyNumber: z.string().min(1).max(50),
  expiresAt: z.string().datetime(),
  documentUrl: z.string().url().optional(),
})

export type VehicleRegisterBody = z.infer<typeof vehicleRegisterSchema>
export type UpdateVehicleBody = z.infer<typeof updateVehicleSchema>
export type InspectionBody = z.infer<typeof inspectionSchema>
export type InsuranceBody = z.infer<typeof insuranceSchema>