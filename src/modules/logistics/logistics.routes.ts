import type { FastifyInstance } from 'fastify'
import { authenticate, authorize } from '../../lib/rbac.js'
import {
  createDeliveryJobSchema,
  submitProofSchema,
  type CreateDeliveryJobBody,
  type SubmitProofBody,
} from './logistics.schema.js'
import { logisticsService } from './logistics.service.js'

export async function logisticsRoutes(app: FastifyInstance) {
  // Merchant endpoints
  app.post<{ Body: CreateDeliveryJobBody }>('/jobs', { preHandler: [authenticate] }, async (req) => {
    const body = createDeliveryJobSchema.parse(req.body)
    return logisticsService.createDeliveryJob({ ...body, merchantId: req.user.sub, scheduledFor: body.scheduledFor ? new Date(body.scheduledFor) : undefined })
  })

  app.get('/jobs', { preHandler: [authenticate] }, async (req) => {
    const { limit, offset } = req.query as { limit?: string; offset?: string }
    return logisticsService.listMerchantJobs(req.user.sub, limit ? parseInt(limit) : 20, offset ? parseInt(offset) : 0)
  })

  app.get('/jobs/:jobId', { preHandler: [authenticate] }, async (req) => {
    const { jobId } = req.params as { jobId: string }
    return logisticsService.getDeliveryJob(jobId)
  })

  app.post('/jobs/:jobId/cancel', { preHandler: [authenticate] }, async (req) => {
    const { jobId } = req.params as { jobId: string }
    return logisticsService.cancelJob(jobId, req.user.sub)
  })

  // Driver endpoints
  app.get('/driver/jobs', { preHandler: [authenticate, authorize('driver')] }, async (req) => {
    const { limit, offset } = req.query as { limit?: string; offset?: string }
    return logisticsService.listDriverJobs(req.user.sub, limit ? parseInt(limit) : 20, offset ? parseInt(offset) : 0)
  })

  app.post('/driver/jobs/:jobId/accept', { preHandler: [authenticate, authorize('driver')] }, async (req) => {
    const { jobId } = req.params as { jobId: string }
    return logisticsService.acceptJob(jobId, req.user.sub)
  })

  app.post('/driver/jobs/:jobId/pickup', { preHandler: [authenticate, authorize('driver')] }, async (req) => {
    const { jobId } = req.params as { jobId: string }
    return logisticsService.pickupJob(jobId, req.user.sub)
  })

  app.post('/driver/jobs/:jobId/deliver', { preHandler: [authenticate, authorize('driver')] }, async (req) => {
    const { jobId } = req.params as { jobId: string }
    return logisticsService.deliverJob(jobId, req.user.sub)
  })

  app.post<{ Body: SubmitProofBody; Params: { jobId: string } }>(
    '/driver/jobs/:jobId/proof',
    { preHandler: [authenticate, authorize('driver')] },
    async (req) => {
      const { jobId } = req.params
      const body = submitProofSchema.parse(req.body)
      return logisticsService.submitProof(jobId, body)
    },
  )

  app.post('/driver/jobs/:jobId/verify-otp', { preHandler: [authenticate, authorize('driver')] }, async (req) => {
    const { jobId } = req.params as { jobId: string }
    const { otp } = req.body as { otp: string }
    return logisticsService.verifyDeliveryOtp(jobId, otp)
  })
}