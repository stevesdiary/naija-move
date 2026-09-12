import { Redis } from 'ioredis'
import { env } from '../config/env.js'

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => Math.min(times * 50, 2000),
  lazyConnect: true,
  tls: env.REDIS_URL.startsWith('redis://') ? {} : undefined,
})

redis.on('error', (err) => {
  console.error('Redis connection error:', err)
})

await redis.connect()