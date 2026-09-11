import { analyticsRepository } from './analytics.repository.js'
import { errors } from '../../lib/errors.js'

export const analyticsService = {
  // Admin: marketplace overview
  async getMarketplaceAnalytics(filters: { startDate?: string; endDate?: string } = {}) {
    const startDate = filters.startDate ? new Date(filters.startDate) : undefined
    const endDate = filters.endDate ? new Date(filters.endDate) : undefined
    return analyticsRepository.getMarketplaceStats({ startDate, endDate })
  },

  // Admin: trips over time
  async getTripsTrend(filters: { startDate?: string; endDate?: string; interval?: 'hour' | 'day' | 'week' | 'month' } = {}) {
    const startDate = filters.startDate ? new Date(filters.startDate) : undefined
    const endDate = filters.endDate ? new Date(filters.endDate) : undefined
    return analyticsRepository.getTripsByPeriod({ startDate, endDate, interval: filters.interval })
  },

  // Admin: revenue over time
  async getRevenueTrend(filters: { startDate?: string; endDate?: string; interval?: 'day' | 'week' | 'month' } = {}) {
    const startDate = filters.startDate ? new Date(filters.startDate) : undefined
    const endDate = filters.endDate ? new Date(filters.endDate) : undefined
    return analyticsRepository.getRevenueByPeriod({ startDate, endDate, interval: filters.interval })
  },

  // Driver: my analytics
  async getDriverAnalytics(driverId: string, filters: { startDate?: string; endDate?: string } = {}) {
    const startDate = filters.startDate ? new Date(filters.startDate) : undefined
    const endDate = filters.endDate ? new Date(filters.endDate) : undefined
    return analyticsRepository.getDriverAnalytics(driverId, { startDate, endDate })
  },

  // Driver: earnings history
  async getDriverEarningsHistory(driverId: string, filters: { startDate?: string; endDate?: string } = {}) {
    const startDate = filters.startDate ? new Date(filters.startDate) : undefined
    const endDate = filters.endDate ? new Date(filters.endDate) : undefined
    return analyticsRepository.getDriverEarningsHistory(driverId, { startDate, endDate })
  },

  // Rider: my analytics
  async getRiderAnalytics(riderId: string, filters: { startDate?: string; endDate?: string } = {}) {
    const startDate = filters.startDate ? new Date(filters.startDate) : undefined
    const endDate = filters.endDate ? new Date(filters.endDate) : undefined
    return analyticsRepository.getRiderAnalytics(riderId, { startDate, endDate })
  },

  // Admin: logistics analytics
  async getLogisticsAnalytics(filters: { startDate?: string; endDate?: string } = {}) {
    const startDate = filters.startDate ? new Date(filters.startDate) : undefined
    const endDate = filters.endDate ? new Date(filters.endDate) : undefined
    return analyticsRepository.getLogisticsStats({ startDate, endDate })
  },

  // Admin: fraud analytics
  async getFraudAnalytics(filters: { startDate?: string; endDate?: string } = {}) {
    const startDate = filters.startDate ? new Date(filters.startDate) : undefined
    const endDate = filters.endDate ? new Date(filters.endDate) : undefined
    return analyticsRepository.getFraudStats({ startDate, endDate })
  },

  // Admin: compliance analytics
  async getComplianceAnalytics(filters: { startDate?: string; endDate?: string } = {}) {
    const startDate = filters.startDate ? new Date(filters.startDate) : undefined
    const endDate = filters.endDate ? new Date(filters.endDate) : undefined
    return analyticsRepository.getComplianceStats({ startDate, endDate })
  },

  // Admin: subscription analytics
  async getSubscriptionAnalytics() {
    return analyticsRepository.getSubscriptionStats()
  },
}