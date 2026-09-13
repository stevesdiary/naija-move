import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../src/config/env.js', () => ({
  env: {
    NODE_ENV: 'test',
    B2_ENDPOINT: 'https://s3.us-west-004.backblazeb2.com',
    B2_REGION: 'us-west-004',
    B2_KEY_ID: 'k',
    B2_APPLICATION_KEY: 's',
    B2_BUCKET: 'test-bucket',
  },
}))

const stat = vi.fn()
vi.mock('../../src/providers/storage.js', () => ({
  storage: {
    enabled: true,
    createUploadUrl: vi.fn(async ({ key }: { key: string }) => ({ url: `https://signed/${key}`, headers: { 'Content-Type': 'image/jpeg', 'Content-Length': '10' }, expiresAt: new Date() })),
    createDownloadUrl: vi.fn(async (key: string) => ({ url: `https://get/${key}`, expiresAt: new Date() })),
    stat: (...a: unknown[]) => stat(...a),
  },
}))

import { uploadsService, buildKey, parseKey } from '../../src/modules/uploads/uploads.service.js'
import { presignSchema } from '../../src/modules/uploads/uploads.schema.js'

const USER = '11111111-1111-4111-8111-111111111111'
const OTHER = '22222222-2222-4222-8222-222222222222'

describe('upload key policy', () => {
  it('builds keys namespaced by purpose and user, with the extension from the content type', () => {
    const key = buildKey('driver_document', USER, 'application/pdf')
    expect(key).toMatch(new RegExp(`^driver-documents/${USER}/[0-9a-f-]{36}\\.pdf$`))
    expect(parseKey(key)).toEqual({ purpose: 'driver_document', userId: USER })
  })

  it('rejects keys it could not have issued', () => {
    expect(parseKey('driver-documents/../etc/passwd')).toBeNull()
    expect(parseKey(`driver-documents/${USER}/notauuid.jpg`)).toBeNull()
    expect(parseKey(`other-prefix/${USER}/${USER}.jpg`)).toBeNull()
    expect(parseKey(`driver-documents/${USER}/${USER}.exe`)).toBeNull()
  })
})

describe('presign schema', () => {
  it('allows images and PDFs up to 10 MiB', () => {
    expect(presignSchema.safeParse({ purpose: 'driver_document', contentType: 'image/jpeg', sizeBytes: 5_000_000 }).success).toBe(true)
  })
  it('rejects other content types and oversize files', () => {
    expect(presignSchema.safeParse({ purpose: 'driver_document', contentType: 'application/x-msdownload', sizeBytes: 10 }).success).toBe(false)
    expect(presignSchema.safeParse({ purpose: 'driver_document', contentType: 'image/jpeg', sizeBytes: 11 * 1024 * 1024 }).success).toBe(false)
    expect(presignSchema.safeParse({ purpose: 'anything', contentType: 'image/jpeg', sizeBytes: 10 }).success).toBe(false)
  })
})

describe('assertOwnedUpload', () => {
  beforeEach(() => stat.mockReset())

  it('accepts a key issued to the user for the purpose once the object exists', async () => {
    stat.mockResolvedValue({ contentLength: 1234, contentType: 'image/jpeg' })
    const key = buildKey('driver_document', USER, 'image/jpeg')
    await expect(uploadsService.assertOwnedUpload(key, USER, 'driver_document')).resolves.toBeUndefined()
  })

  it("refuses another user's key", async () => {
    const key = buildKey('driver_document', OTHER, 'image/jpeg')
    await expect(uploadsService.assertOwnedUpload(key, USER, 'driver_document')).rejects.toMatchObject({ statusCode: 403 })
    expect(stat).not.toHaveBeenCalled()
  })

  it('refuses a key issued for a different purpose', async () => {
    const key = buildKey('profile_photo', USER, 'image/jpeg')
    await expect(uploadsService.assertOwnedUpload(key, USER, 'driver_document')).rejects.toMatchObject({ statusCode: 403 })
  })

  it('refuses a key whose bytes never arrived', async () => {
    stat.mockResolvedValue(null)
    const key = buildKey('driver_document', USER, 'image/jpeg')
    await expect(uploadsService.assertOwnedUpload(key, USER, 'driver_document')).rejects.toMatchObject({ statusCode: 422 })
  })

  it('refuses an object larger than the limit even if it was uploaded', async () => {
    stat.mockResolvedValue({ contentLength: 50 * 1024 * 1024, contentType: 'image/jpeg' })
    const key = buildKey('driver_document', USER, 'image/jpeg')
    await expect(uploadsService.assertOwnedUpload(key, USER, 'driver_document')).rejects.toMatchObject({ statusCode: 422 })
  })
})

describe('downloadUrl', () => {
  it('only signs keys that match the policy', async () => {
    await expect(uploadsService.downloadUrl('arbitrary/path.jpg')).rejects.toMatchObject({ statusCode: 404 })
    const key = buildKey('driver_document', USER, 'image/png')
    await expect(uploadsService.downloadUrl(key)).resolves.toMatchObject({ url: `https://get/${key}` })
  })
})
