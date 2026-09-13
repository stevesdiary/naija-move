import type { FastifyInstance } from 'fastify'
import { authenticate, authorize } from '../../lib/rbac.js'
import {
  createDeliveryJobSchema,
  submitProofSchema,
  verifyDeliveryOtpSchema,
  type CreateDeliveryJobBody,
  type SubmitProofBody,
  type VerifyDeliveryOtpBody,
} from './logistics.schema.js'
import { logisticsService } from './logistics.service.js'
import { driverIdFor } from '../../lib/actors.js'
import { clampLimit, clampOffset } from '../../lib/pagination.js'

export async function logisticsRoutes(app: FastifyInstance) {
  // Merchant endpoints
  app.post<{ Body: CreateDeliveryJobBody }>('/jobs', { preHandler: [authenticate] }, async (req) => {
    const body = createDeliveryJobSchema.parse(req.body)
    return logisticsService.createDeliveryJob({ ...body, merchantId: req.user.sub, scheduledFor: body.scheduledFor ? new Date(body.scheduledFor) : undefined })
  })

  app.get('/jobs', { preHandler: [authenticate] }, async (req) => {
    const { limit, offset } = req.query as { limit?: string; offset?: string }
    return logisticsService.listMerchantJobs(req.user.sub, clampLimit(limit, 20), clampOffset(offset))
  })

  app.get('/jobs/:jobId', { preHandler: [authenticate] }, async (req) => {
    const { jobId } = req.params as { jobId: string }
    const driverId = req.user.role === 'driver' ? await driverIdFor(req.user.sub) : undefined
    return logisticsService.getDeliveryJob(jobId, { userId: req.user.sub, driverId, role: req.user.role })
  })

  app.post('/jobs/:jobId/cancel', { preHandler: [authenticate] }, async (req) => {
    const { jobId } = req.params as { jobId: string }
    return logisticsService.cancelJob(jobId, { id: req.user.sub, role: req.user.role })
  })

  // Driver endpoints
  app.get('/driver/jobs', { preHandler: [authenticate, authorize('driver')] }, async (req) => {
    const { limit, offset } = req.query as { limit?: string; offset?: string }
    return logisticsService.listDriverJobs(await driverIdFor(req.user.sub), clampLimit(limit, 20), clampOffset(offset))
  })

  app.post('/driver/jobs/:jobId/accept', { preHandler: [authenticate, authorize('driver')] }, async (req) => {
    const { jobId } = req.params as { jobId: string }
    return logisticsService.acceptJob(jobId, await driverIdFor(req.user.sub))
  })

  app.post('/driver/jobs/:jobId/pickup', { preHandler: [authenticate, authorize('driver')] }, async (req) => {
    const { jobId } = req.params as { jobId: string }
    return logisticsService.pickupJob(jobId, await driverIdFor(req.user.sub))
  })

  app.post('/driver/jobs/:jobId/deliver', { preHandler: [authenticate, authorize('driver')] }, async (req) => {
    const { jobId } = req.params as { jobId: string }
    return logisticsService.deliverJob(jobId, await driverIdFor(req.user.sub))
  })

  app.post<{ Body: SubmitProofBody; Params: { jobId: string } }>(
    '/driver/jobs/:jobId/proof',
    { preHandler: [authenticate, authorize('driver')] },
    async (req) => {
      const { jobId } = req.params
      const body = submitProofSchema.parse(req.body)
      return logisticsService.submitProof(jobId, { driverId: await driverIdFor(req.user.sub), userId: req.user.sub }, body)
    },
  )

  app.post<{ Body: VerifyDeliveryOtpBody; Params: { jobId: string } }>(
    '/driver/jobs/:jobId/verify-otp',
    { preHandler: [authenticate, authorize('driver')] },
    async (req) => {
      const { jobId } = req.params
      const { otp } = verifyDeliveryOtpSchema.parse(req.body)
      return logisticsService.verifyDeliveryOtp(jobId, await driverIdFor(req.user.sub), otp)
    },
  )
}