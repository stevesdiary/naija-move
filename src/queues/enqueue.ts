import {
  settlementQueue,
  payoutQueue,
  notificationQueue,
  complianceQueue,
  fraudQueue,
} from './queues.js'

export type NotificationJobData = {
  userId: string
  templateId: string
  channel: 'sms' | 'push' | 'whatsapp'
  variables: Record<string, string>
}

export type PayoutJobData = {
  driverId: string
  settlementCycleId: string
}

export type FraudSignalJobData = {
  tripId: string
  signal: string
  metadata: Record<string, unknown>
}

export const enqueue = {
  settlement: () =>
    settlementQueue.add('run', {}, { jobId: `settlement:${Date.now()}` }),

  payout: (data: PayoutJobData) =>
    payoutQueue.add('run', data, { jobId: `payout:${data.driverId}:${data.settlementCycleId}` }),

  notification: (data: NotificationJobData) =>
    notificationQueue.add('send', data, { attempts: 3, backoff: { type: 'exponential', delay: 2000 } }),

  compliance: () =>
    complianceQueue.add('check', {}, { jobId: `compliance:${Date.now()}` }),

  fraud: (data: FraudSignalJobData) =>
    fraudQueue.add('signal', data, { attempts: 2 }),
}
