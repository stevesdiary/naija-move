import type { FastifyInstance } from 'fastify'
import { authenticate, authorize } from '../../lib/rbac.js'
import {
  initializePaymentSchema,
  walletTopupSchema,
  webhookSchema,
  refundSchema,
  driverPayoutSchema,
  type InitializePaymentBody,
  type WalletTopupBody,
  type WebhookBody,
  type RefundBody,
  type DriverPayoutBody,
} from './payments.schema.js'
import { paymentsService } from './payments.service.js'
import { walletService } from './wallet.service.js'
import { env } from '../../config/env.js'
import crypto from 'crypto'
import { riderIdFor } from '../../lib/actors.js'
import { clampLimit, clampOffset } from '../../lib/pagination.js'

export async function paymentRoutes(app: FastifyInstance) {
  // Initialize payment for a trip
  app.post<{ Body: InitializePaymentBody }>(
    '/initialize',
    { preHandler: [authenticate, authorize('rider')] },
    async (req) => {
      const body = initializePaymentSchema.parse(req.body)
      return paymentsService.initializePayment({
        riderId: await riderIdFor(req.user.sub),
        tripId: body.tripId,
        email: body.email,
      })
    }
  )

  // Verify payment
  app.get('/verify/:reference', { preHandler: [authenticate] }, async (req) => {
    const { reference } = req.params as { reference: string }
    const riderId = req.user.role === 'rider' ? await riderIdFor(req.user.sub) : undefined
    return paymentsService.verifyPayment(reference, { userId: req.user.sub, riderId })
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
    return walletService.getWalletTransactions(req.user.sub, role, clampLimit(limit, 50), clampOffset(offset))
  })

  // Initialize wallet top-up — returns Paystack checkout URL
  // Supports card, bank transfer, USSD and mobile money
  app.post<{ Body: WalletTopupBody }>(
    '/wallet/topup/initialize',
    { preHandler: [authenticate] },
    async (req) => {
      const { amountKobo, email } = walletTopupSchema.parse(req.body)
      const ownerType = req.user.role as 'rider' | 'driver' | 'corporate' | 'fleet_owner'
      return paymentsService.initializeWalletTopup({
        ownerId: req.user.sub,
        ownerType,
        amountKobo,
        email,
      })
    }
  )

  // Paystack webhook — no bearer auth; authenticity comes from the HMAC-SHA512 over the *raw* body.
  // Re-serialising the parsed JSON would change whitespace/number formatting and break the MAC,
  // so this child context swaps in a JSON parser that keeps the original bytes.
  await app.register(async (webhooks) => {
    webhooks.addContentTypeParser('application/json', { parseAs: 'buffer' }, (req, body, done) => {
      ;(req as typeof req & { rawBody: Buffer }).rawBody = body as Buffer
      try {
        done(null, JSON.parse((body as Buffer).toString('utf8')))
      } catch (err) {
        done(err as Error, undefined)
      }
    })

    webhooks.post('/webhooks/paystack', async (req, reply) => {
      const signature = req.headers['x-paystack-signature']
      const rawBody = (req as typeof req & { rawBody?: Buffer }).rawBody
      if (typeof signature !== 'string' || !rawBody) return reply.status(400).send({ error: 'Missing signature' })

      const expected = crypto.createHmac('sha512', env.PAYSTACK_WEBHOOK_SECRET).update(rawBody).digest('hex')
      const given = Buffer.from(signature, 'utf8')
      const want = Buffer.from(expected, 'utf8')
      if (given.length !== want.length || !crypto.timingSafeEqual(given, want)) {
        return reply.status(400).send({ error: 'Invalid signature' })
      }

      const parsed = webhookSchema.safeParse(req.body)
      if (!parsed.success) return reply.status(400).send({ error: 'Malformed webhook body' })

      // Acknowledge immediately — Paystack expects 200 within 5s
      reply.status(200).send({ received: true })

      // Process asynchronously after response sent
      paymentsService.handlePaystackWebhook(parsed.data, signature).catch((err) => {
        req.log.error({ err, event: parsed.data.event }, 'Webhook processing error')
      })
    })
  })
}