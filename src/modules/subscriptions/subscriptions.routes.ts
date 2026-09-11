import type { FastifyInstance } from 'fastify'
import { authenticate, authorize } from '../../lib/rbac.js'
import {
  createPlanSchema,
  updatePlanSchema,
  subscribeSchema,
  type CreatePlanBody,
  type UpdatePlanBody,
  type SubscribeBody,
} from './subscriptions.schema.js'
import { subscriptionsService } from './subscriptions.service.js'

export async function subscriptionsRoutes(app: FastifyInstance) {
  // Public: list available plans
  app.get('/plans', { preHandler: [authenticate] }, async () => {
    return subscriptionsService.listPlans()
  })

  // Driver: subscribe to plan
  app.post<{ Body: SubscribeBody }>('/subscribe', { preHandler: [authenticate, authorize('driver')] }, async (req) => {
    const body = subscribeSchema.parse(req.body)
    return subscriptionsService.subscribe(req.user.sub, body.planId)
  })

  // Driver: get my subscription
  app.get('/me', { preHandler: [authenticate, authorize('driver')] }, async (req) => {
    return subscriptionsService.getMySubscription(req.user.sub)
  })

  // Driver: cancel subscription
  app.post('/cancel', { preHandler: [authenticate, authorize('driver')] }, async (req) => {
    return subscriptionsService.cancelSubscription(req.user.sub)
  })

  // Admin: create plan
  app.post<{ Body: CreatePlanBody }>('/admin/plans', { preHandler: [authenticate, authorize('admin')] }, async (req) => {
    const body = createPlanSchema.parse(req.body)
    return subscriptionsService.createPlan(body)
  })

  // Admin: list all plans
  app.get('/admin/plans', { preHandler: [authenticate, authorize('admin')] }, async () => {
    return subscriptionsService.listPlans()
  })

  // Admin: update plan
  app.put<{ Body: UpdatePlanBody; Params: { planId: string } }>(
    '/admin/plans/:planId',
    { preHandler: [authenticate, authorize('admin')] },
    async (req) => {
      const { planId } = req.params
      const body = updatePlanSchema.parse(req.body)
      return subscriptionsService.updatePlan(planId, body)
    },
  )

  // Admin: delete plan
  app.delete('/admin/plans/:planId', { preHandler: [authenticate, authorize('admin')] }, async (req) => {
    const { planId } = req.params as { planId: string }
    return subscriptionsService.deletePlan(planId)
  })
}