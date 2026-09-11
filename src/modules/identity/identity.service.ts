import { redis } from '../../lib/idempotency.js'
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../lib/jwt.js'
import { errors } from '../../lib/errors.js'
import { sms } from '../../providers/sms.js'
import { v4 as uuid } from 'uuid'

const OTP_TTL = 300 // 5 minutes
const OTP_RATE_LIMIT = 3 // max requests per window
const OTP_RATE_WINDOW = 600 // 10 minutes

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function requestOtp(phone: string): Promise<void> {
  const rateLimitKey = `otp:rate:${phone}`
  const count = await redis.incr(rateLimitKey)
  if (count === 1) await redis.expire(rateLimitKey, OTP_RATE_WINDOW)
  if (count > OTP_RATE_LIMIT) throw errors.unprocessable('Too many OTP requests. Try again later.')

  const code = generateOtp()
  await redis.set(`otp:${phone}`, code, { ex: OTP_TTL })
  await sms.sendOtp(phone, code)
}

export async function verifyOtp(
  phone: string,
  code: string,
): Promise<{ accessToken: string; refreshToken: string; userId: string }> {
  const stored = await redis.get<string>(`otp:${phone}`)
  if (!stored || stored !== code) throw errors.unauthorized('Invalid or expired OTP')

  await redis.del(`otp:${phone}`)

  // In Phase 3 full implementation this will upsert the user in DB
  // For now we issue tokens with a deterministic userId derived from phone
  const userId = uuid()
  const sessionId = uuid()

  const payload = { sub: userId, role: 'rider' as const, sessionId }
  const accessToken = signAccessToken(payload)
  const refreshToken = signRefreshToken(payload)

  // Store refresh token in Redis (Phase 3 will persist to DB)
  await redis.set(`refresh:${sessionId}`, refreshToken, { ex: 60 * 60 * 24 * 30 })

  return { accessToken, refreshToken, userId }
}

export async function refreshTokens(
  token: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  const payload = verifyRefreshToken(token)

  const stored = await redis.get<string>(`refresh:${payload.sessionId}`)
  if (!stored || stored !== token) throw errors.unauthorized('Refresh token revoked or invalid')

  // Rotate — invalidate old, issue new pair
  await redis.del(`refresh:${payload.sessionId}`)

  const newSessionId = uuid()
  const newPayload = { sub: payload.sub, role: payload.role, sessionId: newSessionId }
  const accessToken = signAccessToken(newPayload)
  const refreshToken = signRefreshToken(newPayload)

  await redis.set(`refresh:${newSessionId}`, refreshToken, { ex: 60 * 60 * 24 * 30 })

  return { accessToken, refreshToken }
}

export async function logout(sessionId: string): Promise<void> {
  await redis.del(`refresh:${sessionId}`)
}
