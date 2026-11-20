import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto'
import { env } from '../config/env.js'

/**
 * Authenticated field-level encryption (AES-256-GCM) for identity data at rest
 * — a verified NIN response carries the rider's name, gender, date of birth,
 * phone and a biometric photograph, none of which belongs in a plaintext
 * column.
 *
 * Stored format: `v1:<iv>:<authTag>:<ciphertext>`, all base64. The version
 * prefix lets the key/scheme rotate later without guessing at old rows.
 */
const VERSION = 'v1'

function resolveKey(): Buffer {
  const raw = env.IDENTITY_ENCRYPTION_KEY
  if (raw) {
    // Accept a 32-byte key as hex (64 chars) or base64; anything else is hashed to 32 bytes.
    if (/^[0-9a-f]{64}$/i.test(raw)) return Buffer.from(raw, 'hex')
    const b64 = Buffer.from(raw, 'base64')
    if (b64.length === 32) return b64
    return scryptSync(raw, 'naijamove-identity', 32)
  }
  // Dev fallback: derive from the access secret so the flow works out of the
  // box. env.ts fails the boot if this path is hit in production with identity
  // verification enabled, so this only runs in dev/test.
  return scryptSync(env.JWT_ACCESS_SECRET, 'naijamove-identity', 32)
}

const KEY = resolveKey()

export function encryptField(plaintext: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', KEY, iv)
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${VERSION}:${iv.toString('base64')}:${tag.toString('base64')}:${enc.toString('base64')}`
}

export function decryptField(stored: string): string {
  const [version, ivB64, tagB64, dataB64] = stored.split(':')
  if (version !== VERSION) throw new Error(`Unsupported field-encryption version: ${version}`)
  const iv = Buffer.from(ivB64, 'base64')
  const decipher = createDecipheriv('aes-256-gcm', KEY, iv)
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'))
  return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8')
}

export function encryptJson(value: unknown): string {
  return encryptField(JSON.stringify(value))
}

export function decryptJson<T = unknown>(stored: string): T {
  return JSON.parse(decryptField(stored)) as T
}
