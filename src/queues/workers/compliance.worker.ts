import { Worker } from 'bullmq'
import { bullConnection } from '../connection.js'

export const complianceWorker = new Worker(
  'compliance',
  async (job) => {
    job.log('Running compliance expiry check')
    // TODO: Phase 11 — find expiring docs, flag drivers, enqueue notifications
  },
  { connection: bullConnection, concurrency: 1 },
)
