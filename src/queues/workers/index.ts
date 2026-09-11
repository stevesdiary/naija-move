import { settlementWorker } from './settlement.worker.js'
import { payoutWorker } from './payout.worker.js'
import { notificationWorker } from './notification.worker.js'
import { complianceWorker } from './compliance.worker.js'
import { fraudWorker } from './fraud.worker.js'

export function startWorkers() {
  const workers = [
    settlementWorker,
    payoutWorker,
    notificationWorker,
    complianceWorker,
    fraudWorker,
  ]

  for (const worker of workers) {
    worker.on('failed', (job, err) => {
      console.error(`[${worker.name}] Job ${job?.id} failed:`, err.message)
    })
  }
}
