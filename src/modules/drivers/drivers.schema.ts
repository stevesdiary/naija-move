import { z } from 'zod'

export const availabilitySchema = z.object({
  isOnline: z.boolean(),
})

export const locationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
})

export const documentUploadSchema = z.object({
  type: z.enum(['drivers_licence', 'vehicle_registration', 'insurance', 'inspection', 'background_check', 'profile_photo']),
  /** Object key returned by POST /uploads/presign (purpose `driver_document`). */
  fileKey: z.string().min(1).max(200).optional(),
  referenceNumber: z.string().max(100).optional(),
  expiresAt: z.string().datetime().optional(),
})

export const profilePhotoSchema = z.object({
  /** Object key returned by POST /uploads/presign (purpose `profile_photo`). */
  fileKey: z.string().min(1).max(200),
})

export const adminActionSchema = z.object({
  reason: z.string().min(1).max(500).optional(),
})

export type AvailabilityBody = z.infer<typeof availabilitySchema>
export type LocationBody = z.infer<typeof locationSchema>
export type DocumentUploadBody = z.infer<typeof documentUploadSchema>
export type AdminActionBody = z.infer<typeof adminActionSchema>
export type ProfilePhotoBody = z.infer<typeof profilePhotoSchema>