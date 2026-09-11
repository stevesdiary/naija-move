import type { FastifyInstance } from 'fastify'
import { authenticate, authorize } from '../../lib/rbac.js'
import {
  initializePaymentSchema,
  webhookSchema,
  refundSchema,
  driverPayoutSchema,
  type InitializePaymentBody,
  type WebhookBody,
  type RefundBody,
  type DriverPayoutBody,
} from './payments.schema.js'
import { paymentsService } from './payments.service.js'
import { walletService } from './wallet.service.js'
import { env } from '../../config/env.js'
import crypto from 'crypto'

export async function paymentRoutes(app: FastifyInstance) {
  // Initialize payment for a trip
  app.post<{ Body: InitializePaymentBody }>(
    '/initialize',
    { preHandler: [authenticate, authorize('rider')] },
    async (req) => {
      const body = initializePaymentSchema.parse(req.body)
      
      // Get trip to verify ownership and get amount
      // In production, fetch trip and calculate amount
      const amountKobo = 500000 // placeholder - 5000 NGN
      
      return paymentsService.initializePayment({
        riderId: req.user.sub,
        tripId: body.tripId,
        amountKobo,
        email: body.email,
        metadata: body.metadata,
      })
    }
  )

  // Verify payment
  app.get('/verify/:reference', { preHandler: [authenticate, authorize('rider')] }, async (req) => {
    const { reference } = req.params as { reference: string }
    return paymentsService.verifyPayment(reference)
  })

  // Refund
  app.post<{ Body: RefundBody }>('/refund', { preHandler: [authenticate, authorize('admin')] }, async (req) => {
    const body = refundSchema.parse(req.body)
    return paymentsService.refundPayment(body.reference, body.amountKobo)
  })

  // Driver payout (admin)
  app.post<{ Body: DriverPayoutBody }>('/payout/driver', { preHandler: [authenticate, authorize('admin')] }, async (req) => {
    const body = driverPayoutSchema.parse(req.body)
    return paymentsService.createDriverPayout(body.driverId, body.amountKobo, body.settlementCycleId)
  })

  // Wallet balance
  app.get('/wallet/balance', { preHandler: [authenticate] }, async (req) => {
    const role = req.user.role as 'rider' | 'driver' | 'corporate' | 'fleet_owner'
    return walletService.getBalance(req.user.sub, role)
  })

  // Wallet transactions
  app.get('/wallet/transactions', { preHandler: [authenticate] }, async (req) => {
    const { limit, offset } = req.query as { limit?: string; offset?: string }
    const role = req.user.role as 'rider' | 'driver' | 'corporate' | 'fleet_owner'
    return walletService.getWalletTransactions(req.user.sub, role, limit ? parseInt(limit) : 50, offset ? parseInt(offset) : 0)
  })

  // Top up wallet
  app.post<{ Body: { amountKobo: number; reference: string; description: string } }>(
    '/wallet/topup',
    { preHandler: [authenticate] },
    async (req) => {
      const { amountKobo, reference, description } = req.body
      const role = req.user.role as 'rider' | 'driver' | 'corporate' | 'fleet_owner'
      return walletService.topUp(req.user.sub, role, amountKobo, reference, description)
    }
  )

  // Withdraw from wallet
  app.post<{ Body: { amountKobo: number; reference: string; description: string } }>(
    '/wallet/withdraw',
    { preHandler: [authenticate] },
    async (req) => {
      const { amountKobo, reference, description } = req.body
      const role = req.user.role as 'rider' | 'driver' | 'corporate' | 'fleet_owner'
      return walletService.withdraw(req.user.sub, role, amountKobo, reference, description)
    }
  )

  // Paystack webhook (no auth, verified by signature)
  app.post<{ Body: WebhookBody }>('/webhooks/paystack', async (req, reply) => {
    const signature = req.headers['x-paystack-signature'] as string
    const body = req.body

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha512', env.PAYSTACK_WEBHOOK_SECRET)
      .update(JSON.stringify(body))
      .digest('hex')

    if (signature !== expectedSignature) {
      return reply.status(400).send({ error: 'Invalid signature' })
    }

    return paymentsService.handlePaystackWebhook(body, signature)
  })
}