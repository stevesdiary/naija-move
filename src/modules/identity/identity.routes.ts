import type { FastifyInstance } from 'fastify'
import { authenticate } from '../../lib/rbac.js'
import {
  otpRequestSchema,
  otpVerifySchema,
  tokenRefreshSchema,
  adminLoginSchema,
  type OtpRequestBody,
  type OtpVerifyBody,
  type TokenRefreshBody,
  type AdminLoginBody,
} from './identity.schema.js'
import {
  requestOtp,
  verifyOtp,
  adminLogin,
  refreshTokens,
  logout,
} from './identity.service.js'

export async function identityRoutes(app: FastifyInstance) {
  app.post<{ Body: OtpRequestBody }>('/otp/request', async (req, reply) => {
    const body = otpRequestSchema.parse(req.body)
    await requestOtp(body.phone)
    return reply.status(202).send({ message: 'OTP sent' })
  })

  app.post<{ Body: OtpVerifyBody }>('/otp/verify', async (req, reply) => {
    const body = otpVerifySchema.parse(req.body)
    const result = await verifyOtp(body.phone, body.code)
    return reply.status(200).send(result)
  })

  // Admin dashboard login — tighter per-IP limit than the global one; scrypt makes each attempt cost ~50ms anyway.
  app.post<{ Body: AdminLoginBody }>(
    '/admin/login',
    { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } },
    async (req, reply) => {
      const body = adminLoginSchema.parse(req.body)
      const result = await adminLogin(body.email, body.password)
      return reply.status(200).send(result)
    },
  )

  app.post<{ Body: TokenRefreshBody }>('/token/refresh', async (req, reply) => {
    const body = tokenRefreshSchema.parse(req.body)
    const result = await refreshTokens(body.refreshToken)
    return reply.status(200).send(result)
  })

  app.post('/logout', { preHandler: authenticate }, async (req, reply) => {
    await logout(req.user.sessionId)
    return reply.status(204).send()
  })
}
