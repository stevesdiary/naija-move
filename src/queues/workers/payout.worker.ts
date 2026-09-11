import { Worker } from 'bullmq'
import { bullConnection } from '../connection.js'

export const payoutWorker = new Worker(
  'payout',
  async (job) => {
    const { driverId, settlementCycleId } = job.data
    job.log(`Processing payout for driver ${driverId}, cycle ${settlementCycleId}`)
    // TODO: Phase 8 — call Paystack transfer API, update ledger
  },
  { connection: bullConnection, concurrency: 5 },
)
