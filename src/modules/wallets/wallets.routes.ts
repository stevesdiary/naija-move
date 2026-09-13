import type { FastifyInstance } from 'fastify'
import { authenticate, authorize } from '../../lib/rbac.js'
import { walletService } from '../payments/wallet.service.js'
import { z } from 'zod'
import { clampLimit, clampOffset } from '../../lib/pagination.js'

const withdrawSchema = z.object({
  amountKobo: z.number().int().positive(),
  bankCode: z.string().min(1),
  accountNumber: z.string().min(10).max(10),
  accountName: z.string().min(1),
})

export async function walletRoutes(app: FastifyInstance) {
  // Any authenticated user: get own wallet balance
  app.get('/balance', { preHandler: [authenticate] }, async (req) => {
    const ownerType = req.user.role as 'rider' | 'driver' | 'corporate' | 'fleet_owner'
    return walletService.getBalance(req.user.sub, ownerType)
  })

  // Any authenticated user: get own wallet transactions
  app.get('/transactions', { preHandler: [authenticate] }, async (req) => {
    const { limit, offset } = req.query as { limit?: string; offset?: string }
    const ownerType = req.user.role as 'rider' | 'driver' | 'corporate' | 'fleet_owner'
    return walletService.getWalletTransactions(
      req.user.sub,
      ownerType,
      clampLimit(limit, 50),
      clampOffset(offset),
    )
  })

  // Driver: request withdrawal to bank account
  app.post(
    '/withdraw',
    { preHandler: [authenticate, authorize('driver', 'fleet_owner')] },
    async (req) => {
      const body = withdrawSchema.parse(req.body)
      const ownerType = req.user.role as 'driver' | 'fleet_owner'
      return walletService.withdraw(
        req.user.sub,
        ownerType,
        body.amountKobo,
        `withdraw_${req.user.sub}_${Date.now()}`,
        `Withdrawal to ${body.accountName} (${body.accountNumber})`,
      )
    },
  )
}
