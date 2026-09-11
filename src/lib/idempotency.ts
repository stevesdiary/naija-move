import { Redis } from '@upstash/redis'
import { env } from '../config/env.js'
import { errors } from './errors.js'

const redis = new Redis({
  url: env.UPSTASH_REDIS_REST_URL,
  token: env.UPSTASH_REDIS_REST_TOKEN,
})

const TTL_SECONDS = 86400 // 24h

export async function checkIdempotency(key: string): Promise<boolean> {
  const exists = await redis.get(key)
  return exists !== null
}

export async function markIdempotency(key: string): Promise<void> {
  await redis.set(key, '1', { ex: TTL_SECONDS })
}

export async function assertIdempotent(key: string): Promise<void> {
  const exists = await checkIdempotency(key)
  if (exists) throw errors.conflict('Duplicate request — already processed')
  await markIdempotency(key)
}

export { redis }
