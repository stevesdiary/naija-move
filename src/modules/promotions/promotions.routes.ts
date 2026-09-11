import type { FastifyInstance } from 'fastify'
import { authenticate, authorize } from '../../lib/rbac.js'
import {
  createPromotionSchema,
  updatePromotionSchema,
  redeemPromotionSchema,
  referralSchema,
  type CreatePromotionBody,
  type UpdatePromotionBody,
  type RedeemPromotionBody,
  type ReferralBody,
} from './promotions.schema.js'
import { promotionsService } from './promotions.service.js'

export async function promotionsRoutes(app: FastifyInstance) {
  // User: list available promotions
  app.get('/', { preHandler: [authenticate] }, async (req) => {
    const userType = req.user.role === 'driver' ? 'driver' : 'rider'
    return promotionsService.listAvailablePromotions(userType)
  })

  // User: redeem promotion
  app.post<{ Body: RedeemPromotionBody }>('/redeem', { preHandler: [authenticate] }, async (req) => {
    const body = redeemPromotionSchema.parse(req.body)
    return promotionsService.redeemPromotion(req.user.sub, body.code, body.tripId)
  })

  // User: list my redemptions
  app.get('/my-redemptions', { preHandler: [authenticate] }, async (req) => {
    const { limit, offset } = req.query as { limit?: string; offset?: string }
    return promotionsService.listMyRedemptions(req.user.sub, limit ? parseInt(limit) : 20, offset ? parseInt(offset) : 0)
  })

  // Referrals
  app.get('/referrals', { preHandler: [authenticate] }, async (req) => {
    const { limit, offset } = req.query as { limit?: string; offset?: string }
    return promotionsService.listMyReferrals(req.user.sub, limit ? parseInt(limit) : 20, offset ? parseInt(offset) : 0)
  })

  // Admin: create promotion
  app.post<{ Body: CreatePromotionBody }>('/', { preHandler: [authenticate, authorize('admin')] }, async (req) => {
    const body = createPromotionSchema.parse(req.body)
    return promotionsService.createPromotion({ ...body, createdBy: req.user.sub, startsAt: new Date(body.startsAt), endsAt: body.endsAt ? new Date(body.endsAt) : undefined })
  })

  // Admin: list all promotions
  app.get('/admin/all', { preHandler: [authenticate, authorize('admin')] }, async (req) => {
    const { limit, offset } = req.query as { limit?: string; offset?: string }
    return promotionsService.listAllPromotions(limit ? parseInt(limit) : 20, offset ? parseInt(offset) : 0)
  })

  // Admin: update promotion
  app.put<{ Body: UpdatePromotionBody; Params: { id: string } }>(
    '/:id',
    { preHandler: [authenticate, authorize('admin')] },
    async (req) => {
      const { id } = req.params
      const body = updatePromotionSchema.parse(req.body)
      return promotionsService.updatePromotion(id, { ...body, endsAt: body.endsAt ? new Date(body.endsAt) : undefined })
    },
  )

  // Admin: delete promotion
  app.delete('/:id', { preHandler: [authenticate, authorize('admin')] }, async (req) => {
    const { id } = req.params as { id: string }
    return promotionsService.deletePromotion(id)
  })
}