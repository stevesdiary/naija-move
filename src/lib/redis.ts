import { Redis } from 'ioredis'
import { env } from '../config/env.js'

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => Math.min(times * 50, 2000),
  lazyConnect: true,
  tls: env.REDIS_URL.startsWith('rediss://') ? {} : undefined,
})

redis.on('error', (err) => {
  console.error('Redis connection error:', err)
})

// Intentionally NOT calling redis.connect() here: the client is configured with
// lazyConnect, so it connects on first command (e.g. the first rate-limit hit).
// A top-level await connect() would defeat lazyConnect, turn importing app.ts
// into a live-socket side effect, and crash boot/tests/scripts whenever Redis is
// briefly unreachable.