import { Worker } from 'bullmq'
import { bullConnection } from '../connection.js'

export const fraudWorker = new Worker(
  'fraud',
  async (job) => {
    const { tripId, signal } = job.data
    job.log(`Processing fraud signal "${signal}" for trip ${tripId}`)
    // TODO: Phase 11 — evaluate signal, update fraud score, flag for review
  },
  { connection: bullConnection, concurrency: 5 },
)
