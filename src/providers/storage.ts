import { HeadObjectCommand, PutObjectCommand, GetObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { env } from '../config/env.js'
import { AppError } from '../lib/errors.js'

/**
 * Object storage on Backblaze B2 via its S3-compatible API.
 *
 * Clients never hold B2 credentials. The server hands out short-lived presigned
 * PUT URLs bound to a specific key + content type + byte length, the client
 * uploads straight to the bucket, then submits the key back. Reads of the
 * private bucket go through presigned GET URLs the same way.
 */
export const UPLOAD_URL_TTL_SECONDS = 15 * 60
export const DOWNLOAD_URL_TTL_SECONDS = 10 * 60

export interface StorageProvider {
  readonly enabled: boolean
  createUploadUrl(params: { key: string; contentType: string; contentLength: number }): Promise<{ url: string; headers: Record<string, string>; expiresAt: Date }>
  createDownloadUrl(key: string): Promise<{ url: string; expiresAt: Date }>
  /** Returns the object's size/type, or null if it does not exist. */
  stat(key: string): Promise<{ contentLength: number; contentType: string | undefined } | null>
}

function buildClient(): S3Client | null {
  if (!env.B2_ENDPOINT || !env.B2_REGION || !env.B2_KEY_ID || !env.B2_APPLICATION_KEY || !env.B2_BUCKET) return null
  return new S3Client({
    endpoint: env.B2_ENDPOINT,
    region: env.B2_REGION,
    credentials: { accessKeyId: env.B2_KEY_ID, secretAccessKey: env.B2_APPLICATION_KEY },
    // B2 serves buckets at <bucket>.<endpoint>; path style also works and avoids DNS surprises with dotted names.
    forcePathStyle: true,
  })
}

const client = buildClient()
const bucket = env.B2_BUCKET ?? ''

function requireClient(): S3Client {
  if (!client) throw new AppError(501, 'STORAGE_DISABLED', 'File storage is not configured')
  return client
}

export const storage: StorageProvider = {
  enabled: client !== null,

  async createUploadUrl({ key, contentType, contentLength }) {
    const s3 = requireClient()
    const cmd = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType, ContentLength: contentLength })
    const url = await getSignedUrl(s3, cmd, { expiresIn: UPLOAD_URL_TTL_SECONDS })
    return {
      url,
      // These are part of the signature — the client must send them verbatim or B2 rejects the PUT.
      headers: { 'Content-Type': contentType, 'Content-Length': String(contentLength) },
      expiresAt: new Date(Date.now() + UPLOAD_URL_TTL_SECONDS * 1000),
    }
  },

  async createDownloadUrl(key) {
    const s3 = requireClient()
    const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: DOWNLOAD_URL_TTL_SECONDS })
    return { url, expiresAt: new Date(Date.now() + DOWNLOAD_URL_TTL_SECONDS * 1000) }
  },

  async stat(key) {
    const s3 = requireClient()
    try {
      const head = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }))
      return { contentLength: head.ContentLength ?? 0, contentType: head.ContentType }
    } catch (err) {
      const status = (err as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode
      if (status === 404) return null
      throw err
    }
  },
}
