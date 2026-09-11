import { fraudRepository } from './fraud.repository.js'
import { errors } from '../../lib/errors.js'

export const fraudService = {
  // Report fraud (user-facing)
  async reportFraud(reporterId: string, data: { entityId: string; entityType: 'user' | 'trip' | 'device'; signalType: string; description: string }) {
    return fraudRepository.createSignal({
      entityId: data.entityId,
      entityType: data.entityType,
      signalType: data.signalType as any,
      confidence: 0.5,
      metadata: JSON.stringify({ reportedBy: reporterId, description: data.description }),
      requiresReview: true,
    })
  },

  // Internal: create signal from automated detection
  async createSignal(data: {
    entityId: string
    entityType: 'user' | 'trip' | 'device'
    signalType: string
    confidence: number
    metadata?: Record<string, any>
    tripId?: string
    requiresReview?: boolean
  }) {
    return fraudRepository.createSignal({
      entityId: data.entityId,
      entityType: data.entityType,
      signalType: data.signalType as any,
      confidence: data.confidence,
      metadata: data.metadata ? JSON.stringify(data.metadata) : undefined,
      tripId: data.tripId,
      requiresReview: data.requiresReview ?? (data.confidence > 0.8),
    })
  },

  // Admin: list signals
  async listSignals(filters: { entityId?: string; entityType?: string; signalType?: string; requiresReview?: boolean; limit?: number; offset?: number } = {}) {
    return fraudRepository.listSignals(filters)
  },

  // Admin: get signal details
  async getSignal(signalId: string) {
    const signal = await fraudRepository.findSignalById(signalId)
    if (!signal) throw errors.notFound('Fraud signal not found')

    const review = await fraudRepository.findReviewBySignalId(signalId)
    return { signal, review }
  },

  // Admin: create review
  async createReview(reviewerId: string, signalId: string, status: 'cleared' | 'confirmed' | 'escalated', note?: string) {
    const signal = await fraudRepository.findSignalById(signalId)
    if (!signal) throw errors.notFound('Fraud signal not found')

    const existingReview = await fraudRepository.findReviewBySignalId(signalId)
    if (existingReview) throw errors.conflict('Review already exists for this signal')

    const review = await fraudRepository.createReview({
      fraudSignalId: signalId,
      reviewedBy: reviewerId,
      status,
      note,
      actionTaken: status === 'confirmed' ? 'suspended' : status === 'escalated' ? 'escalated' : 'cleared',
    })

    // Update signal requiresReview flag
    await fraudRepository.updateSignal(signalId, { requiresReview: false })

    return { signal, review }
  },

  // Admin: list reviews
  async listReviews(filters: { status?: string; limit?: number; offset?: number } = {}) {
    return fraudRepository.listReviews(filters)
  },

  // Admin: update review
  async updateReview(reviewId: string, data: { status?: 'pending' | 'cleared' | 'confirmed' | 'escalated'; note?: string; actionTaken?: string }) {
    return fraudRepository.updateReview(reviewId, data)
  },

  // Admin: get fraud stats
  async getStats() {
    return fraudRepository.getSignalStats()
  },

  // Automated detection helpers
  async detectImpossibleTravel(userId: string, lastLocation: { lat: number; lng: number; timestamp: Date }, currentLocation: { lat: number; lng: number; timestamp: Date }) {
    const distance = this.calculateDistance(lastLocation, currentLocation)
    const timeDiffHours = (currentLocation.timestamp.getTime() - lastLocation.timestamp.getTime()) / (1000 * 60 * 60)
    const maxSpeedKmh = 120 // Maximum reasonable speed

    if (timeDiffHours > 0 && distance / timeDiffHours > maxSpeedKmh) {
      await this.createSignal({
        entityId: userId,
        entityType: 'user',
        signalType: 'impossible_travel',
        confidence: 0.9,
        metadata: { distanceKm: distance, timeDiffHours, maxSpeedKmh },
        requiresReview: true,
      })
    }
  },

  async detectGpsSpoof(userId: string, locations: { lat: number; lng: number; accuracy?: number }[]) {
    // Simple check: if accuracy is consistently very high (suspicious) or locations jump erratically
    const lowAccuracyCount = locations.filter(l => (l.accuracy ?? 0) > 100).length
    if (lowAccuracyCount / locations.length > 0.5) {
      await this.createSignal({
        entityId: userId,
        entityType: 'user',
        signalType: 'gps_spoof',
        confidence: 0.7,
        metadata: { lowAccuracyCount, totalPoints: locations.length },
        requiresReview: true,
      })
    }
  },

  async detectPromoAbuse(userId: string, redemptions: number, timeWindowHours: number) {
    if (redemptions > 5 && timeWindowHours < 24) {
      await this.createSignal({
        entityId: userId,
        entityType: 'user',
        signalType: 'promo_abuse',
        confidence: 0.8,
        metadata: { redemptions, timeWindowHours },
        requiresReview: true,
      })
    }
  },

  calculateDistance(loc1: { lat: number; lng: number }, loc2: { lat: number; lng: number }) {
    const R = 6371 // Earth radius in km
    const dLat = (loc2.lat - loc1.lat) * Math.PI / 180
    const dLng = (loc2.lng - loc1.lng) * Math.PI / 180
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(loc1.lat * Math.PI / 180) * Math.cos(loc2.lat * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  },
}