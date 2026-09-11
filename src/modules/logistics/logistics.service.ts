import { logisticsRepository } from './logistics.repository.js'
import { errors } from '../../lib/errors.js'

export const logisticsService = {
  async createDeliveryJob(params: {
    merchantId: string
    pickupAddress: string
    pickupLat: number
    pickupLng: number
    dropoffAddress: string
    dropoffLat: number
    dropoffLng: number
    recipientName: string
    recipientPhone: string
    parcelType: string
    parcelDescription?: string
    declaredValueKobo?: number
    priceKobo: number
    scheduledFor?: Date
  }) {
    return logisticsRepository.createJob(params)
  },

  async getDeliveryJob(jobId: string) {
    const job = await logisticsRepository.findJobById(jobId)
    if (!job) throw errors.notFound('Delivery job not found')
    return job
  },

  async listMerchantJobs(merchantId: string, limit = 20, offset = 0) {
    return logisticsRepository.findJobsByMerchant(merchantId, limit, offset)
  },

  async listDriverJobs(driverId: string, limit = 20, offset = 0) {
    return logisticsRepository.findJobsByDriver(driverId, limit, offset)
  },

  async acceptJob(jobId: string, driverId: string) {
    const job = await logisticsRepository.findJobById(jobId)
    if (!job) throw errors.notFound('Delivery job not found')
    if (job.status !== 'pending' && job.status !== 'matched') throw errors.unprocessable('Job not available')
    return logisticsRepository.updateJobStatus(jobId, 'matched', driverId)
  },

  async pickupJob(jobId: string, driverId: string) {
    const job = await logisticsRepository.findJobById(jobId)
    if (!job) throw errors.notFound('Delivery job not found')
    if (job.driverId !== driverId) throw errors.forbidden('Not your job')
    if (job.status !== 'matched') throw errors.unprocessable('Job not in matched state')
    return logisticsRepository.updateJobStatus(jobId, 'picked_up', driverId)
  },

  async deliverJob(jobId: string, driverId: string) {
    const job = await logisticsRepository.findJobById(jobId)
    if (!job) throw errors.notFound('Delivery job not found')
    if (job.driverId !== driverId) throw errors.forbidden('Not your job')
    if (job.status !== 'picked_up') throw errors.unprocessable('Job not picked up yet')
    return logisticsRepository.updateJobStatus(jobId, 'delivered', driverId)
  },

  async submitProof(jobId: string, data: { otp?: string; photoUrl?: string; recipientConfirmed?: string }) {
    const job = await logisticsRepository.findJobById(jobId)
    if (!job) throw errors.notFound('Delivery job not found')
    return logisticsRepository.createProof({ deliveryJobId: jobId, ...data })
  },

  async verifyDeliveryOtp(jobId: string, otp: string) {
    const valid = await logisticsRepository.verifyOtp(jobId, otp)
    if (!valid) throw errors.unauthorized('Invalid OTP')
    return logisticsRepository.updateJobStatus(jobId, 'delivered')
  },

  async cancelJob(jobId: string, actorId: string) {
    const job = await logisticsRepository.findJobById(jobId)
    if (!job) throw errors.notFound('Delivery job not found')
    return logisticsRepository.updateJobStatus(jobId, 'cancelled')
  },
}