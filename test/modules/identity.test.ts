import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Redis and SMS before importing service
vi.mock('../../src/lib/idempotency.js', () => {
  const store = new Map<string, string>()
  return {
    redis: {
      get: vi.fn(async (k: string) => store.get(k) ?? null),
      set: vi.fn(async (k: string, v: string) => { store.set(k, v) }),
      del: vi.fn(async (k: string) => { store.delete(k) }),
      incr: vi.fn(async (k: string) => {
        const val = parseInt(store.get(k) ?? '0') + 1
        store.set(k, String(val))
        return val
      }),
      expire: vi.fn(async () => {}),
    },
    checkIdempotency: vi.fn(async () => false),
    markIdempotency: vi.fn(async () => {}),
    assertIdempotent: vi.fn(async () => {}),
  }
})

vi.mock('../../src/providers/sms.js', () => ({
  sms: { sendOtp: vi.fn(async () => {}), sendMessage: vi.fn(async () => {}) },
}))

vi.mock('../../src/config/env.js', () => ({
  env: {
    NODE_ENV: 'test',
    JWT_ACCESS_SECRET: 'test-access-secret-that-is-long-enough-32c',
    JWT_REFRESH_SECRET: 'test-refresh-secret-that-is-long-enough-32c',
    UPSTASH_REDIS_REST_URL: 'http://localhost',
    UPSTASH_REDIS_REST_TOKEN: 'token',
    REDIS_URL: 'redis://localhost:6379',
    QSTASH_TOKEN: 'token',
    QSTASH_CURRENT_SIGNING_KEY: 'key',
    QSTASH_NEXT_SIGNING_KEY: 'key',
    MAPBOX_ACCESS_TOKEN: 'token',
    PAYSTACK_SECRET_KEY: 'sk_test',
    PAYSTACK_WEBHOOK_SECRET: 'secret',
    INTERNAL_JOB_SECRET: 'internal-secret-that-is-long-enough-32c',
    APP_URL: 'http://localhost:3000',
    PORT: 3000,
    DATABASE_URL: 'postgresql://localhost/test',
  },
}))

import { requestOtp, verifyOtp, refreshTokens } from '../../src/modules/identity/identity.service.js'
import { redis } from '../../src/lib/idempotency.js'

describe('identity service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sends OTP and stores it in Redis', async () => {
    await requestOtp('+2348012345678')
    expect(redis.set).toHaveBeenCalledWith(
      'otp:+2348012345678',
      expect.stringMatching(/^\d{6}$/),
      { ex: 300 },
    )
  })

  it('rejects invalid OTP', async () => {
    vi.mocked(redis.get).mockResolvedValueOnce('123456')
    await expect(verifyOtp('+2348012345678', '000000')).rejects.toThrow('Invalid or expired OTP')
  })

  it('issues token pair on valid OTP', async () => {
    vi.mocked(redis.get).mockResolvedValueOnce('654321')
    const result = await verifyOtp('+2348012345678', '654321')
    expect(result).toHaveProperty('accessToken')
    expect(result).toHaveProperty('refreshToken')
    expect(result).toHaveProperty('userId')
  })

  it('rotates refresh token on refresh', async () => {
    vi.mocked(redis.get).mockResolvedValueOnce('654321')
    const { refreshToken } = await verifyOtp('+2348012345678', '654321')

    // Mock stored token matches
    vi.mocked(redis.get).mockResolvedValueOnce(refreshToken)
    const result = await refreshTokens(refreshToken)
    expect(result).toHaveProperty('accessToken')
    expect(result).toHaveProperty('refreshToken')
    expect(result.refreshToken).not.toBe(refreshToken)
  })

  it('enforces OTP rate limit after 3 requests', async () => {
    vi.mocked(redis.incr)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(4)

    await requestOtp('+2348012345678')
    await requestOtp('+2348012345678')
    await requestOtp('+2348012345678')
    await expect(requestOtp('+2348012345678')).rejects.toThrow('Too many OTP requests')
  })
})
