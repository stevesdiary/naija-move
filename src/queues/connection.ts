import { Redis } from 'ioredis'
import { env } from '../config/env.js'

// BullMQ requires an IORedis-compatible connection
// Upstash Redis supports IORedis via the rediss:// URL
export const bullConnection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null, // required by BullMQ
  enableReadyCheck: false,
})
