import { Worker } from 'bullmq'
import { bullConnection } from '../connection.js'

export const notificationWorker = new Worker(
  'notification',
  async (job) => {
    const { userId, templateId, channel } = job.data
    job.log(`Sending ${channel} notification to user ${userId} using template ${templateId}`)
    // TODO: Phase 10 — resolve template, dispatch via SMS/push/WhatsApp provider
  },
  { connection: bullConnection, concurrency: 10 },
)
