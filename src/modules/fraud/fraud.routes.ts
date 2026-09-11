import type { FastifyInstance } from 'fastify'
import { authenticate, authorize } from '../../lib/rbac.js'
import {
  reportFraudSchema,
  createReviewSchema,
  updateReviewSchema,
  type ReportFraudBody,
  type CreateReviewBody,
  type UpdateReviewBody,
} from './fraud.schema.js'
import { fraudService } from './fraud.service.js'

export async function fraudRoutes(app: FastifyInstance) {
  // User: report fraud
  app.post<{ Body: ReportFraudBody }>('/report', { preHandler: [authenticate] }, async (req) => {
    const body = reportFraudSchema.parse(req.body)
    return fraudService.reportFraud(req.user.sub, body)
  })

  // Admin: list fraud signals
  app.get('/signals', { preHandler: [authenticate, authorize('admin')] }, async (req) => {
    const { entityId, entityType, signalType, requiresReview, limit, offset } = req.query as {
      entityId?: string
      entityType?: string
      signalType?: string
      requiresReview?: string
      limit?: string
      offset?: string
    }
    return fraudService.listSignals({
      entityId,
      entityType,
      signalType,
      requiresReview: requiresReview === 'true',
      limit: limit ? parseInt(limit) : 20,
      offset: offset ? parseInt(offset) : 0,
    })
  })

  // Admin: get signal details
  app.get('/signals/:signalId', { preHandler: [authenticate, authorize('admin')] }, async (req) => {
    const { signalId } = req.params as { signalId: string }
    return fraudService.getSignal(signalId)
  })

  // Admin: create review
  app.post<{ Body: CreateReviewBody }>('/reviews', { preHandler: [authenticate, authorize('admin')] }, async (req) => {
    const body = createReviewSchema.parse(req.body)
    return fraudService.createReview(req.user.sub, body.signalId, body.status, body.note)
  })

  // Admin: list reviews
  app.get('/reviews', { preHandler: [authenticate, authorize('admin')] }, async (req) => {
    const { status, limit, offset } = req.query as { status?: string; limit?: string; offset?: string }
    return fraudService.listReviews({ status, limit: limit ? parseInt(limit) : 20, offset: offset ? parseInt(offset) : 0 })
  })

  // Admin: update review
  app.put<{ Body: UpdateReviewBody; Params: { reviewId: string } }>(
    '/reviews/:reviewId',
    { preHandler: [authenticate, authorize('admin')] },
    async (req) => {
      const { reviewId } = req.params
      const body = updateReviewSchema.parse(req.body)
      return fraudService.updateReview(reviewId, body)
    },
  )

  // Admin: fraud stats
  app.get('/stats', { preHandler: [authenticate, authorize('admin')] }, async () => {
    return fraudService.getStats()
  })
}