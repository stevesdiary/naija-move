import { randomInt, timingSafeEqual } from 'node:crypto'
import { redis } from '../../lib/idempotency.js'
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../lib/jwt.js'
import { errors } from '../../lib/errors.js'
import { sms } from '../../providers/sms.js'
import { v4 as uuid } from 'uuid'
import { identityRepository } from './identity.repository.js'
import { verifyPassword } from '../../lib/password.js'
import type { UserRole } from '../../lib/jwt.js'

const OTP_TTL = 300 // 5 minutes
const OTP_RATE_LIMIT = 3 // max requests per window
const OTP_RATE_WINDOW = 600 // 10 minutes
const OTP_MAX_ATTEMPTS = 5 // wrong guesses before the code is burned

function generateOtp(): string {
  return randomInt(100000, 1000000).toString()
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  return ab.length === bb.length && timingSafeEqual(ab, bb)
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
): Promise<{ accessToken: string; refreshToken: string; userId: string; isNewUser: boolean; name: string | null }> {
  const stored = await redis.get<string>(`otp:${phone}`)
  if (!stored) throw errors.unauthorized('Invalid or expired OTP')

  // 6 digits at 100 req/min/IP is brute-forceable without a per-code attempt cap.
  const attemptsKey = `otp:attempts:${phone}`
  const attempts = await redis.incr(attemptsKey)
  if (attempts === 1) await redis.expire(attemptsKey, OTP_TTL)
  if (attempts > OTP_MAX_ATTEMPTS) {
    await redis.del(`otp:${phone}`)
    throw errors.unauthorized('Too many attempts — request a new code')
  }

  if (!safeEqual(String(stored), code)) throw errors.unauthorized('Invalid or expired OTP')

  await redis.del(`otp:${phone}`, attemptsKey)

  const user = await identityRepository.upsertRiderByPhone(phone)
  if (!user.isActive) throw errors.forbidden('Account is disabled')
  // SMS OTP is phishable/SIM-swappable — not strong enough to unlock admin rights.
  if (user.role === 'admin') throw errors.forbidden('Admins must sign in with email and password')

  const { accessToken, refreshToken } = await issueSession(user.id, user.role)
  return { accessToken, refreshToken, userId: user.id, isNewUser: user.isNew, name: user.name }
}

export async function adminLogin(
  email: string,
  password: string,
): Promise<{ accessToken: string; refreshToken: string; userId: string; name: string | null }> {
  const user = await identityRepository.findUserByEmail(email.toLowerCase())
  // Always run the hash check so a missing account isn't distinguishable by timing.
  const ok = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH)
  if (!user || !user.passwordHash || !ok) throw errors.unauthorized('Invalid email or password')
  if (user.role !== 'admin') throw errors.forbidden('Not an admin account')
  if (!user.isActive) throw errors.forbidden('Account is disabled')

  const { accessToken, refreshToken } = await issueSession(user.id, user.role)
  return { accessToken, refreshToken, userId: user.id, name: user.name }
}

/** Issue a fresh access/refresh pair for a user; used by every login path and by refresh. */
export async function issueSession(userId: string, role: UserRole) {
  const sessionId = uuid()
  const payload = { sub: userId, role, sessionId }
  const accessToken = signAccessToken(payload)
  const refreshToken = signRefreshToken(payload)
  await redis.set(`refresh:${sessionId}`, refreshToken, { ex: 60 * 60 * 24 * 30 })
  return { accessToken, refreshToken, sessionId }
}

// A valid scrypt hash of a random value — only used to equalise timing when the email is unknown.
const DUMMY_HASH = 'scrypt$32768$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='

export async function refreshTokens(
  token: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  const payload = verifyRefreshToken(token)

  const stored = await redis.get<string>(`refresh:${payload.sessionId}`)
  if (!stored || stored !== token) throw errors.unauthorized('Refresh token revoked or invalid')

  // Rotate — invalidate old, issue new pair
  await redis.del(`refresh:${payload.sessionId}`)

  // Re-read the account so deactivation and role changes take effect within
  // one access-token lifetime instead of persisting for 30 days.
  const user = await identityRepository.findUserById(payload.sub)
  if (!user || !user.isActive) throw errors.unauthorized('Account is disabled')

  const { accessToken, refreshToken } = await issueSession(user.id, user.role)
  return { accessToken, refreshToken }
}

export async function logout(sessionId: string): Promise<void> {
  await redis.del(`refresh:${sessionId}`)
}
