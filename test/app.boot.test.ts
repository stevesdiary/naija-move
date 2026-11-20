import { describe, it, expect, vi } from 'vitest'

// Boot the full Fastify app with infrastructure mocked out. Guards against
// duplicate route registrations and plugin wiring errors that only surface at
// app.ready() time.

vi.mock('../src/config/env.js', () => ({
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
    CORS_ORIGINS: 'http://localhost:5173',
    TRUST_PROXY: 0,
  },
}))

vi.mock('../src/lib/idempotency.js', () => ({
  redis: {
    get: vi.fn(async () => null),
    set: vi.fn(async () => {}),
    del: vi.fn(async () => {}),
    incr: vi.fn(async () => 1),
    expire: vi.fn(async () => {}),
  },
  checkIdempotency: vi.fn(async () => false),
  markIdempotency: vi.fn(async () => {}),
  assertIdempotent: vi.fn(async () => {}),
}))

vi.mock('../src/queues/connection.js', () => ({ bullConnection: {} }))
vi.mock('../src/queues/queues.js', () => {
  const q = { add: vi.fn(async () => ({ id: 'job' })) }
  return { settlementQueue: q, payoutQueue: q, notificationQueue: q, complianceQueue: q, fraudQueue: q }
})
vi.mock('../src/db/index.js', () => ({ db: {} }))

// @fastify/rate-limit talks to Redis on register; use its in-memory store instead.
vi.mock('@fastify/rate-limit', async () => {
  const actual = await vi.importActual<typeof import('@fastify/rate-limit')>('@fastify/rate-limit')
  const plugin = actual.default
  const wrapped = (app: any, opts: any) => plugin(app, { ...opts, redis: undefined })
  Object.assign(wrapped, plugin)
  return { default: wrapped }
})

import { buildApp } from '../src/app.js'

describe('app boot', () => {
  it('registers every module without route conflicts', async () => {
    const app = await buildApp()
    await app.ready()
    const res = await app.inject({ method: 'GET', url: '/health' })
    expect(res.statusCode).toBe(200)
    expect(res.json().status).toBe('ok')
    await app.close()
  })
})
