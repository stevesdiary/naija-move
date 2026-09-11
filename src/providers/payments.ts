import { env } from '../config/env.js'
import { errors } from '../lib/errors.js'

const BASE = 'https://api.paystack.co'

const headers = {
  Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
  'Content-Type': 'application/json',
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = (await res.json()) as { status: boolean; message: string; data: T }
  if (!data.status) throw errors.internal(`Paystack: ${data.message}`)
  return data.data
}

export type InitializeResult = { authorization_url: string; access_code: string; reference: string }
export type VerifyResult = { status: string; amount: number; reference: string; channel: string }
export type TransferResult = { transfer_code: string; status: string }

export const paystack = {
  initialize: (email: string, amountKobo: number, reference: string, metadata?: Record<string, unknown>) =>
    call<InitializeResult>('POST', '/transaction/initialize', {
      email,
      amount: amountKobo,
      reference,
      metadata,
    }),

  verify: (reference: string) =>
    call<VerifyResult>('GET', `/transaction/verify/${reference}`),

  transfer: (amountKobo: number, recipientCode: string, reference: string, reason: string) =>
    call<TransferResult>('POST', '/transfer', {
      source: 'balance',
      amount: amountKobo,
      recipient: recipientCode,
      reference,
      reason,
    }),

  refund: (transaction: string, amountKobo?: number) =>
    call('POST', '/refund', { transaction, amount: amountKobo }),
}
