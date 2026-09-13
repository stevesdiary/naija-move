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

vi.mock('../../src/modules/identity/identity.repository.js', () => ({
  identityRepository: {
    findUserByPhone: vi.fn(async () => null),
    findUserById: vi.fn(async () => ({ id: '11111111-1111-4111-8111-111111111111', role: 'rider', isActive: true })),
    findUserByEmail: vi.fn(async () => null),
    setRole: vi.fn(async () => undefined),
    upsertRiderByPhone: vi.fn(async () => ({ id: '11111111-1111-4111-8111-111111111111', name: null, role: 'rider', isNew: true, isActive: true })),
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
    expect(result.isNewUser).toBe(true)
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

describe('identity service — OTP hardening', () => {
  it('burns the code after too many wrong guesses', async () => {
    await requestOtp('+2348012345678')
    for (let i = 0; i < 5; i++) {
      await expect(verifyOtp('+2348012345678', '000000')).rejects.toMatchObject({ statusCode: 401 })
    }
    // 6th attempt: locked out, and the stored code is gone so even the right code fails
    await expect(verifyOtp('+2348012345678', '000000')).rejects.toMatchObject({ statusCode: 401 })
    expect(await redis.get('otp:+2348012345678')).toBeNull()
  })

  it('refuses login for a disabled account', async () => {
    const { identityRepository } = await import('../../src/modules/identity/identity.repository.js')
    vi.mocked(identityRepository.upsertRiderByPhone).mockResolvedValueOnce({
      id: '22222222-2222-4222-8222-222222222222', name: null, role: 'rider', isNew: false, isActive: false,
    })
    await requestOtp('+2348099999999')
    const code = (await redis.get<string>('otp:+2348099999999'))!
    await expect(verifyOtp('+2348099999999', String(code))).rejects.toMatchObject({ statusCode: 403 })
  })
})

describe('identity service — roles and admin login', () => {
  it('issues the role stored on the account, not a hardcoded one', async () => {
    const { identityRepository } = await import('../../src/modules/identity/identity.repository.js')
    const { verifyAccessToken } = await import('../../src/lib/jwt.js')
    vi.mocked(identityRepository.upsertRiderByPhone).mockResolvedValueOnce({
      id: '33333333-3333-4333-8333-333333333333', name: 'D', role: 'driver', isNew: false, isActive: true,
    })
    await requestOtp('+2348011111111')
    const code = (await redis.get<string>('otp:+2348011111111'))!
    const { accessToken } = await verifyOtp('+2348011111111', String(code))
    expect(verifyAccessToken(accessToken).role).toBe('driver')
  })

  it('refuses SMS-OTP login for admin accounts', async () => {
    const { identityRepository } = await import('../../src/modules/identity/identity.repository.js')
    vi.mocked(identityRepository.upsertRiderByPhone).mockResolvedValueOnce({
      id: '44444444-4444-4444-8444-444444444444', name: 'A', role: 'admin', isNew: false, isActive: true,
    })
    await requestOtp('+2348022222222')
    const code = (await redis.get<string>('otp:+2348022222222'))!
    await expect(verifyOtp('+2348022222222', String(code))).rejects.toMatchObject({ statusCode: 403 })
  })

  it('admin login: unknown email and wrong password both yield the same 401', async () => {
    const { identityRepository } = await import('../../src/modules/identity/identity.repository.js')
    const { hashPassword } = await import('../../src/lib/password.js')
    const { adminLogin } = await import('../../src/modules/identity/identity.service.js')

    await expect(adminLogin('nobody@example.com', 'whatever123')).rejects.toMatchObject({ statusCode: 401, message: 'Invalid email or password' })

    const passwordHash = await hashPassword('hunter2hunter2')
    vi.mocked(identityRepository.findUserByEmail).mockResolvedValue({
      id: '55555555-5555-4555-8555-555555555555', name: 'Ops', role: 'admin', isActive: true, passwordHash,
    } as any)
    await expect(adminLogin('ops@example.com', 'wrongwrong')).rejects.toMatchObject({ statusCode: 401, message: 'Invalid email or password' })
    const ok = await adminLogin('ops@example.com', 'hunter2hunter2')
    expect(ok.userId).toBe('55555555-5555-4555-8555-555555555555')
  })

  it('admin login: a non-admin account with a password is refused', async () => {
    const { identityRepository } = await import('../../src/modules/identity/identity.repository.js')
    const { hashPassword } = await import('../../src/lib/password.js')
    const { adminLogin } = await import('../../src/modules/identity/identity.service.js')
    vi.mocked(identityRepository.findUserByEmail).mockResolvedValueOnce({
      id: '66666666-6666-4666-8666-666666666666', role: 'rider', isActive: true, passwordHash: await hashPassword('hunter2hunter2'),
    } as any)
    await expect(adminLogin('r@example.com', 'hunter2hunter2')).rejects.toMatchObject({ statusCode: 403 })
  })

  it('refresh re-reads the account and refuses a deactivated user', async () => {
    const { identityRepository } = await import('../../src/modules/identity/identity.repository.js')
    await requestOtp('+2348033333333')
    const code = (await redis.get<string>('otp:+2348033333333'))!
    const { refreshToken } = await verifyOtp('+2348033333333', String(code))
    vi.mocked(identityRepository.findUserById).mockResolvedValueOnce({ id: 'x', role: 'rider', isActive: false } as any)
    await expect(refreshTokens(refreshToken)).rejects.toMatchObject({ statusCode: 401 })
  })
})
