import { randomUUID } from 'node:crypto'
import { storage } from '../../providers/storage.js'
import { errors } from '../../lib/errors.js'
import { ALLOWED_CONTENT_TYPES, MAX_UPLOAD_BYTES, type UploadPurpose } from './uploads.schema.js'

const PREFIX: Record<UploadPurpose, string> = {
  driver_document: 'driver-documents',
  profile_photo: 'profile-photos',
  vehicle_photo: 'vehicle-photos',
  delivery_proof: 'delivery-proofs',
  support_attachment: 'support-attachments',
}

/** Keys are `<purpose-prefix>/<ownerUserId>/<uuid>.<ext>` — ownership is in the path. */
export function buildKey(purpose: UploadPurpose, userId: string, contentType: string): string {
  return `${PREFIX[purpose]}/${userId}/${randomUUID()}.${ALLOWED_CONTENT_TYPES[contentType]}`
}

const KEY_RE = /^(driver-documents|profile-photos|vehicle-photos|delivery-proofs|support-attachments)\/([0-9a-f-]{36})\/[0-9a-f-]{36}\.(jpg|png|webp|pdf)$/

/** Parses a key the client sends back; returns null if it isn't one we could have issued. */
export function parseKey(key: string): { purpose: UploadPurpose; userId: string } | null {
  const m = KEY_RE.exec(key)
  if (!m) return null
  const purpose = (Object.entries(PREFIX).find(([, p]) => p === m[1])?.[0] ?? null) as UploadPurpose | null
  return purpose ? { purpose, userId: m[2] } : null
}

export const uploadsService = {
  get enabled() {
    return storage.enabled
  },

  async presign(userId: string, purpose: UploadPurpose, contentType: string, sizeBytes: number) {
    const key = buildKey(purpose, userId, contentType)
    const signed = await storage.createUploadUrl({ key, contentType, contentLength: sizeBytes })
    return { key, uploadUrl: signed.url, headers: signed.headers, expiresAt: signed.expiresAt, maxBytes: MAX_UPLOAD_BYTES }
  },

  /**
   * Before a key is attached to a record, prove (a) it was issued to this user
   * for this purpose and (b) the bytes actually landed in the bucket. Stops a
   * client from attaching someone else's file or a never-uploaded key.
   */
  async assertOwnedUpload(key: string, userId: string, purpose: UploadPurpose): Promise<void> {
    const parsed = parseKey(key)
    if (!parsed || parsed.userId !== userId || parsed.purpose !== purpose) {
      throw errors.forbidden('File key was not issued to you for this purpose')
    }
    const meta = await storage.stat(key)
    if (!meta) throw errors.unprocessable('File has not been uploaded yet')
    if (meta.contentLength > MAX_UPLOAD_BYTES) throw errors.unprocessable('Uploaded file exceeds the size limit')
  },

  /** Presigned read for a stored key. Callers enforce who may see it. */
  async downloadUrl(key: string) {
    if (!parseKey(key)) throw errors.notFound('File not found')
    return storage.createDownloadUrl(key)
  },
}
