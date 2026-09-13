import type { FastifyInstance } from 'fastify'
import { authenticate, authorize } from '../../lib/rbac.js'
import { ledgerService } from './ledger.service.js'
import { errors } from '../../lib/errors.js'
import { clampLimit, clampOffset } from '../../lib/pagination.js'

const VALID_ACCOUNTS = [
  'rider_wallet',
  'driver_payable',
  'platform_revenue',
  'platform_liability',
  'promo_expense',
  'refund_liability',
  'payout_clearing',
  'corporate_wallet',
] as const

export async function ledgerRoutes(app: FastifyInstance) {
  // Admin: account balance summary
  app.get<{ Params: { account: string } }>(
    '/accounts/:account/balance',
    { preHandler: [authenticate, authorize('admin')] },
    async (req) => {
      const { account } = req.params
      if (!VALID_ACCOUNTS.includes(account as any)) {
        throw errors.badRequest(`Unknown account: ${account}`)
      }
      return ledgerService.getAccountBalance(account)
    },
  )

  // Admin: entries for a specific reference (trip, payout, refund, topup)
  app.get(
    '/entries',
    { preHandler: [authenticate, authorize('admin')] },
    async (req) => {
      const { referenceId, referenceType, account, from, to, limit, offset } = req.query as {
        referenceId?: string
        referenceType?: string
        account?: string
        from?: string
        to?: string
        limit?: string
        offset?: string
      }

      if (referenceId && referenceType) {
        const entries = await ledgerService.getEntriesForReference(referenceId, referenceType)
        return { entries }
      }

      const entries = await ledgerService.getRecentEntries(
        clampLimit(limit, 50),
        clampOffset(offset),
        account,
        from ? new Date(from) : undefined,
        to ? new Date(to) : undefined,
      )
      return { entries }
    },
  )

  // Admin: entries by correlation id (debit + credit pair)
  app.get<{ Params: { correlationId: string } }>(
    '/correlations/:correlationId',
    { preHandler: [authenticate, authorize('admin')] },
    async (req) => {
      const { correlationId } = req.params
      const entries = await ledgerService.getEntriesByCorrelationId(correlationId)
      return { correlationId, entries }
    },
  )

  // Admin: wallet balance for any owner
  app.get(
    '/wallet-balance',
    { preHandler: [authenticate, authorize('admin')] },
    async (req) => {
      const { ownerId, ownerType } = req.query as {
        ownerId: string
        ownerType: 'rider' | 'driver' | 'corporate' | 'fleet_owner'
      }
      if (!ownerId || !ownerType) throw errors.badRequest('ownerId and ownerType are required')
      return ledgerService.getWalletBalance(ownerId, ownerType)
    },
  )
}
