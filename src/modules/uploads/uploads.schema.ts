import { z } from 'zod'

/** What the file is for — decides the key prefix and who may later read it. */
export const uploadPurposes = ['driver_document', 'profile_photo', 'vehicle_photo', 'delivery_proof', 'support_attachment'] as const
export type UploadPurpose = (typeof uploadPurposes)[number]

export const ALLOWED_CONTENT_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
}

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024 // 10 MiB

export const presignSchema = z.object({
  purpose: z.enum(uploadPurposes),
  contentType: z.string().refine((t) => t in ALLOWED_CONTENT_TYPES, 'Unsupported file type — use JPEG, PNG, WebP or PDF'),
  sizeBytes: z.number().int().positive().max(MAX_UPLOAD_BYTES, 'File must be 10 MB or smaller'),
})

export type PresignBody = z.infer<typeof presignSchema>
