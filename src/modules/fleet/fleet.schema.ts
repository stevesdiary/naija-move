import { z } from 'zod'

export const createOwnerSchema = z.object({
  businessName: z.string().max(100).optional(),
})

export const updateOwnerSchema = z.object({
  businessName: z.string().max(100).optional(),
  isVerified: z.boolean().optional(),
})

export const addVehicleSchema = z.object({
  vehicleId: z.string().uuid(),
})

export const updateVehicleAvailabilitySchema = z.object({
  isAvailableForAssignment: z.boolean(),
})

export const createAssignmentSchema = z.object({
  fleetVehicleId: z.string().uuid(),
  driverId: z.string().uuid(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
})

export const updateAssignmentSchema = z.object({
  endDate: z.string().datetime().optional(),
  isActive: z.boolean().optional(),
})

export type CreateOwnerBody = z.infer<typeof createOwnerSchema>
export type UpdateOwnerBody = z.infer<typeof updateOwnerSchema>
export type AddVehicleBody = z.infer<typeof addVehicleSchema>
export type UpdateVehicleAvailabilityBody = z.infer<typeof updateVehicleAvailabilitySchema>
export type CreateAssignmentBody = z.infer<typeof createAssignmentSchema>
export type UpdateAssignmentBody = z.infer<typeof updateAssignmentSchema>