import { Worker } from 'bullmq'
import { bullConnection } from '../connection.js'

export const settlementWorker = new Worker(
  'settlement',
  async (job) => {
    job.log('Running settlement batch')
    // TODO: Phase 8 — group driver payables by cycle, create payout jobs
  },
  { connection: bullConnection, concurrency: 1 },
)
