import { randomInt, timingSafeEqual } from 'node:crypto'
import { logisticsRepository } from './logistics.repository.js'
import { errors } from '../../lib/errors.js'
import { sms } from '../../providers/sms.js'
import { redis } from '../../lib/idempotency.js'

const OTP_MAX_ATTEMPTS = 5
const OTP_ATTEMPT_WINDOW = 60 * 60 // 1h

function generateDeliveryOtp(): string {
  return randomInt(1000, 10000).toString()
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  return ab.length === bb.length && timingSafeEqual(ab, bb)
}

type Job = NonNullable<Awaited<ReturnType<typeof logisticsRepository.findJobById>>>

async function loadJob(jobId: string): Promise<Job> {
  const job = await logisticsRepository.findJobById(jobId)
  if (!job) throw errors.notFound('Delivery job not found')
  return job
}

function assertAssignedDriver(job: Job, driverId: string) {
  if (job.driverId !== driverId) throw errors.forbidden('Not your job')
}

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
    const job = await logisticsRepository.createJob(params)
    if (!job) throw errors.internal('Failed to create delivery job')

    // The delivery OTP is minted here and sent to the recipient — the driver
    // never sees it and can only submit a guess at verify time.
    const otp = generateDeliveryOtp()
    await logisticsRepository.createProof({ deliveryJobId: job.id, otp })
    await sms.sendMessage(
      params.recipientPhone,
      `NaijaMove: your delivery code is ${otp}. Share it with the driver only when you receive your parcel.`,
    )
    return job
  },

  /** Merchant who created the job (a user id), the assigned driver (a driver profile id), or an admin. */
  async getDeliveryJob(jobId: string, actor: { userId: string; driverId?: string; role: string }) {
    const job = await loadJob(jobId)
    const allowed =
      actor.role === 'admin' ||
      job.merchantId === actor.userId ||
      (actor.driverId !== undefined && job.driverId === actor.driverId)
    if (!allowed) throw errors.forbidden('Not your job')
    return job
  },

  async listMerchantJobs(merchantId: string, limit = 20, offset = 0) {
    return logisticsRepository.findJobsByMerchant(merchantId, limit, offset)
  },

  async listDriverJobs(driverId: string, limit = 20, offset = 0) {
    return logisticsRepository.findJobsByDriver(driverId, limit, offset)
  },

  async acceptJob(jobId: string, driverId: string) {
    const job = await loadJob(jobId)
    // Only unassigned jobs — accepting a 'matched' job would steal it from its driver.
    if (job.status !== 'pending') throw errors.unprocessable('Job not available')
    return logisticsRepository.updateJobStatus(jobId, 'matched', driverId)
  },

  async pickupJob(jobId: string, driverId: string) {
    const job = await loadJob(jobId)
    assertAssignedDriver(job, driverId)
    if (job.status !== 'matched') throw errors.unprocessable('Job not in matched state')
    return logisticsRepository.updateJobStatus(jobId, 'picked_up', driverId)
  },

  async deliverJob(jobId: string, driverId: string) {
    const job = await loadJob(jobId)
    assertAssignedDriver(job, driverId)
    if (job.status !== 'picked_up') throw errors.unprocessable('Job not picked up yet')
    const proof = await logisticsRepository.findProofByJobId(jobId)
    if (!proof?.otpVerifiedAt) throw errors.unprocessable('Recipient OTP has not been verified')
    return logisticsRepository.updateJobStatus(jobId, 'delivered', driverId)
  },

  async submitProof(jobId: string, driverId: string, data: { photoUrl?: string; recipientConfirmed?: string }) {
    const job = await loadJob(jobId)
    assertAssignedDriver(job, driverId)
    if (job.status !== 'picked_up') throw errors.unprocessable('Job not picked up yet')
    return logisticsRepository.updateProof(jobId, data)
  },

  async verifyDeliveryOtp(jobId: string, driverId: string, otp: string) {
    const job = await loadJob(jobId)
    assertAssignedDriver(job, driverId)
    if (job.status !== 'picked_up') throw errors.unprocessable('Job not picked up yet')

    const attemptsKey = `delivery_otp:attempts:${jobId}`
    const attempts = await redis.incr(attemptsKey)
    if (attempts === 1) await redis.expire(attemptsKey, OTP_ATTEMPT_WINDOW)
    if (attempts > OTP_MAX_ATTEMPTS) throw errors.unprocessable('Too many OTP attempts. Contact support.')

    const proof = await logisticsRepository.findProofByJobId(jobId)
    if (!proof?.otp || proof.otpVerifiedAt || !safeEqual(proof.otp, otp)) {
      throw errors.unauthorized('Invalid OTP')
    }

    await logisticsRepository.markOtpVerified(proof.id)
    return logisticsRepository.updateJobStatus(jobId, 'delivered', driverId)
  },

  /** Merchant can cancel their own job until it is picked up; admins can cancel any. */
  async cancelJob(jobId: string, actor: { id: string; role: string }) {
    const job = await loadJob(jobId)
    if (actor.role !== 'admin' && job.merchantId !== actor.id) throw errors.forbidden('Not your job')
    if (['picked_up', 'in_transit', 'delivered', 'cancelled'].includes(job.status)) {
      throw errors.unprocessable(`Cannot cancel a job in '${job.status}' state`)
    }
    return logisticsRepository.updateJobStatus(jobId, 'cancelled')
  },
}
