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

export async function corporateRoutes(app: FastifyInstance) {
  // Admin: create corporate account
  app.post<{ Body: CreateAccountBody }>('/', { preHandler: [authenticate, authorize('admin')] }, async (req) => {
    const body = createAccountSchema.parse(req.body)
    return corporateService.createAccount(body)
  })

  // Admin: list corporate accounts
  app.get('/', { preHandler: [authenticate, authorize('admin')] }, async (req) => {
    const { limit, offset } = req.query as { limit?: string; offset?: string }
    return corporateService.listAccounts(limit ? parseInt(limit) : 20, offset ? parseInt(offset) : 0)
  })

  // Get corporate account
  app.get('/:accountId', { preHandler: [authenticate] }, async (req) => {
    const { accountId } = req.params as { accountId: string }
    return corporateService.getAccount(accountId)
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
    return corporateService.listMembers(accountId)
  })

  app.put<{ Body: UpdateMemberBody; Params: { accountId: string; memberId: string } }>(
    '/:accountId/members/:memberId',
    { preHandler: [authenticate, authorize('admin')] },
    async (req) => {
      const { memberId } = req.params
      const body = updateMemberSchema.parse(req.body)
      return corporateService.updateMember(memberId, body)
    },
  )

  app.delete('/:accountId/members/:memberId', { preHandler: [authenticate, authorize('admin')] }, async (req) => {
    const { memberId } = req.params as { memberId: string }
    return corporateService.removeMember(memberId)
  })

  // Wallet
  app.get('/:accountId/wallet', { preHandler: [authenticate] }, async (req) => {
    const { accountId } = req.params as { accountId: string }
    return corporateService.getWallet(accountId)
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
    return corporateService.listCorporateTrips(accountId, limit ? parseInt(limit) : 20, offset ? parseInt(offset) : 0)
  })
}