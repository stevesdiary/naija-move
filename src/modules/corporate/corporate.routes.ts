import type { FastifyInstance } from 'fastify'
import { authenticate, authorize } from '../../lib/rbac.js'
import {
  createAccountSchema,
  updateAccountSchema,
  addMemberSchema,
  updateMemberSchema,
  linkTripSchema,
  type CreateAccountBody,
  type UpdateAccountBody,
  type AddMemberBody,
  type UpdateMemberBody,
  type LinkTripBody,
} from './corporate.schema.js'
import { corporateService } from './corporate.service.js'
import { clampLimit, clampOffset } from '../../lib/pagination.js'

export async function corporateRoutes(app: FastifyInstance) {
  // Admin: create corporate account
  app.post<{ Body: CreateAccountBody }>('/', { preHandler: [authenticate, authorize('admin')] }, async (req) => {
    const body = createAccountSchema.parse(req.body)
    return corporateService.createAccount(body)
  })

  // Admin: list corporate accounts
  app.get('/', { preHandler: [authenticate, authorize('admin')] }, async (req) => {
    const { limit, offset } = req.query as { limit?: string; offset?: string }
    return corporateService.listAccounts(clampLimit(limit, 20), clampOffset(offset))
  })

  // Get corporate account
  app.get('/:accountId', { preHandler: [authenticate] }, async (req) => {
    const { accountId } = req.params as { accountId: string }
    return corporateService.getAccount(accountId, { userId: req.user.sub, role: req.user.role })
  })

  // Update corporate account (admin)
  app.put<{ Body: UpdateAccountBody; Params: { accountId: string } }>(
    '/:accountId',
    { preHandler: [authenticate, authorize('admin')] },
    async (req) => {
      const { accountId } = req.params
      const body = updateAccountSchema.parse(req.body)
      return corporateService.updateAccount(accountId, body)
    },
  )

  // Members
  app.post<{ Body: AddMemberBody; Params: { accountId: string } }>(
    '/:accountId/members',
    { preHandler: [authenticate, authorize('admin')] },
    async (req) => {
      const { accountId } = req.params
      const body = addMemberSchema.parse(req.body)
      return corporateService.addMember(accountId, body)
    },
  )

  app.get('/:accountId/members', { preHandler: [authenticate] }, async (req) => {
    const { accountId } = req.params as { accountId: string }
    return corporateService.listMembers(accountId, { userId: req.user.sub, role: req.user.role })
  })

  app.put<{ Body: UpdateMemberBody; Params: { accountId: string; memberId: string } }>(
    '/:accountId/members/:memberId',
    { preHandler: [authenticate, authorize('admin')] },
    async (req) => {
      const { accountId, memberId } = req.params
      const body = updateMemberSchema.parse(req.body)
      return corporateService.updateMember(accountId, memberId, body)
    },
  )

  app.delete('/:accountId/members/:memberId', { preHandler: [authenticate, authorize('admin')] }, async (req) => {
    const { accountId, memberId } = req.params as { accountId: string; memberId: string }
    return corporateService.removeMember(accountId, memberId)
  })

  // Wallet
  app.get('/:accountId/wallet', { preHandler: [authenticate] }, async (req) => {
    const { accountId } = req.params as { accountId: string }
    return corporateService.getWallet(accountId, { userId: req.user.sub, role: req.user.role })
  })

  // Corporate trips
  app.post<{ Body: LinkTripBody; Params: { accountId: string } }>(
    '/:accountId/trips',
    { preHandler: [authenticate, authorize('admin')] },
    async (req) => {
      const { accountId } = req.params
      const body = linkTripSchema.parse(req.body)
      return corporateService.linkTrip({ ...body, corporateAccountId: accountId })
    },
  )

  app.get('/:accountId/trips', { preHandler: [authenticate] }, async (req) => {
    const { accountId } = req.params as { accountId: string }
    const { limit, offset } = req.query as { limit?: string; offset?: string }
    return corporateService.listCorporateTrips(accountId, { userId: req.user.sub, role: req.user.role }, clampLimit(limit, 20), clampOffset(offset))
  })
}