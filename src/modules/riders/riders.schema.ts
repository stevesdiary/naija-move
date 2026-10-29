import { z } from 'zod'

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  preferredPaymentMethod: z.string().optional(),
})

export const savedPlaceSchema = z.object({
  label: z.enum(['home', 'work', 'other']),
  name: z.string().min(1).max(100),
  address: z.string().min(1).max(255),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
})

export const emergencyContactSchema = z.object({
  name: z.string().min(1).max(100),
  phone: z.string().regex(/^\+234[0-9]{10}$/, 'Must be a valid Nigerian phone number (+234XXXXXXXXXX)'),
  shareTrips: z.boolean().optional(),
})

export const ninKycSchema = z.object({
  nin: z.string().regex(/^\d{11}$/, 'NIN must be 11 digits'),
  // Optional overrides — default to the names on the rider's own profile.
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
})

export type UpdateProfileBody = z.infer<typeof updateProfileSchema>
export type SavedPlaceBody = z.infer<typeof savedPlaceSchema>
export type EmergencyContactBody = z.infer<typeof emergencyContactSchema>
export type NinKycBody = z.infer<typeof ninKycSchema>