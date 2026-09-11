import type { FastifyReply, FastifyRequest } from 'fastify'
import { verifyAccessToken, type TokenPayload, type UserRole } from './jwt.js'
import { errors } from './errors.js'

declare module 'fastify' {
  interface FastifyRequest {
    user: TokenPayload
  }
}

export function authenticate(req: FastifyRequest, _reply: FastifyReply, done: () => void) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) throw errors.unauthorized()

  const token = header.slice(7)
  req.user = verifyAccessToken(token)
  done()
}

export function authorize(...roles: UserRole[]) {
  return (req: FastifyRequest, _reply: FastifyReply, done: () => void) => {
    if (!req.user) throw errors.unauthorized()
    if (!roles.includes(req.user.role)) throw errors.forbidden()
    done()
  }
}
