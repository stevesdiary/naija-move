import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { errors } from './errors.js'

export type TokenPayload = {
  sub: string        // userId
  role: UserRole
  sessionId: string
}

export type UserRole = 'rider' | 'driver' | 'admin' | 'fleet_owner' | 'corporate_admin'

export function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: '15m' })
}

export function signRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: '30d' })
}

export function verifyAccessToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET) as TokenPayload
  } catch {
    throw errors.unauthorized('Invalid or expired access token')
  }
}

export function verifyRefreshToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, env.JWT_REFRESH_SECRET) as TokenPayload
  } catch {
    throw errors.unauthorized('Invalid or expired refresh token')
  }
}
