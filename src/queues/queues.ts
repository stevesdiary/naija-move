import { Queue } from 'bullmq'
import { bullConnection } from './connection.js'

export const settlementQueue = new Queue('settlement', { connection: bullConnection })
export const payoutQueue = new Queue('payout', { connection: bullConnection })
export const notificationQueue = new Queue('notification', { connection: bullConnection })
export const complianceQueue = new Queue('compliance', { connection: bullConnection })
export const fraudQueue = new Queue('fraud', { connection: bullConnection })
