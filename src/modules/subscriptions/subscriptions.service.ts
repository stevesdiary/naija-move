import { subscriptionsRepository } from './subscriptions.repository.js'
import { errors } from '../../lib/errors.js'

export const subscriptionsService = {
  // Plans
  async listPlans() {
    return subscriptionsRepository.listPlans(true)
  },

  async getPlan(planId: string) {
    const plan = await subscriptionsRepository.findPlanById(planId)
    if (!plan) throw errors.notFound('Subscription plan not found')
    return plan
  },

  // Admin: create plan
  async createPlan(data: { name: string; description?: string; platformFeePercent: number; weeklyFeeKobo: number }) {
    return subscriptionsRepository.createPlan(data)
  },

  // Admin: update plan
  async updatePlan(planId: string, data: { name?: string; description?: string; platformFeePercent?: number; weeklyFeeKobo?: number; isActive?: boolean }) {
    return subscriptionsRepository.updatePlan(planId, data)
  },

  // Admin: delete plan
  async deletePlan(planId: string) {
    return subscriptionsRepository.deletePlan(planId)
  },

  // Driver: subscribe to plan
  async subscribe(driverId: string, planId: string) {
    const plan = await subscriptionsRepository.findPlanById(planId)
    if (!plan || !plan.isActive) throw errors.notFound('Plan not found or inactive')

    const existing = await subscriptionsRepository.findActiveSubscriptionByDriver(driverId)
    if (existing) throw errors.conflict('Driver already has an active subscription')

    const now = new Date()
    const periodEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 1 week

    return subscriptionsRepository.createSubscription({
      driverId,
      planId,
      status: 'active',
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    })
  },

  // Driver: get my subscription
  async getMySubscription(driverId: string) {
    return subscriptionsRepository.findActiveSubscriptionByDriver(driverId)
  },

  // Driver: cancel subscription
  async cancelSubscription(driverId: string) {
    const sub = await subscriptionsRepository.findActiveSubscriptionByDriver(driverId)
    if (!sub) throw errors.notFound('No active subscription found')
    return subscriptionsRepository.cancelSubscription(sub.id)
  },

  // Admin: list all subscriptions
  async listAllSubscriptions(limit = 20, offset = 0) {
    return subscriptionsRepository.listDriverSubscriptions('') // Will be filtered in admin route
  },
}