import { corporateRepository } from './corporate.repository.js'
import { errors } from '../../lib/errors.js'

type Actor = { userId: string; role: string }

/** Platform admins, or active members of the account. `adminOnly` further restricts to corporate admins. */
async function assertAccountAccess(accountId: string, actor: Actor, adminOnly = false) {
  if (actor.role === 'admin') return
  const membership = await corporateRepository.findMembership(accountId, actor.userId)
  if (!membership) throw errors.forbidden('Not a member of this corporate account')
  if (adminOnly && membership.role !== 'admin') throw errors.forbidden('Corporate admin role required')
}

export const corporateService = {
  async createAccount(data: { name: string; email: string; phone?: string }) {
    const existing = await corporateRepository.findAccountByEmail(data.email)
    if (existing) throw errors.conflict('Corporate account with this email already exists')
    return corporateRepository.createAccount(data)
  },

  async getAccount(accountId: string, actor: Actor) {
    await assertAccountAccess(accountId, actor)
    const account = await corporateRepository.findAccountById(accountId)
    if (!account) throw errors.notFound('Corporate account not found')
    return account
  },

  async updateAccount(accountId: string, data: { name?: string; phone?: string; isActive?: boolean }) {
    return corporateRepository.updateAccount(accountId, data)
  },

  async listAccounts(limit = 20, offset = 0) {
    return corporateRepository.listAccounts(limit, offset)
  },

  // Members
  async addMember(accountId: string, data: { userId: string; role?: string; monthlyBudgetKobo?: number }) {
    const account = await corporateRepository.findAccountById(accountId)
    if (!account) throw errors.notFound('Corporate account not found')
    return corporateRepository.addMember({ corporateAccountId: accountId, ...data })
  },

  async listMembers(accountId: string, actor: Actor) {
    await assertAccountAccess(accountId, actor, true)
    return corporateRepository.listMembers(accountId)
  },

  async updateMember(accountId: string, memberId: string, data: { role?: string; monthlyBudgetKobo?: number; isActive?: boolean }) {
    const member = await corporateRepository.findMemberById(memberId)
    if (!member || member.corporateAccountId !== accountId) throw errors.notFound('Member not found')
    return corporateRepository.updateMember(memberId, data)
  },

  async removeMember(accountId: string, memberId: string) {
    const member = await corporateRepository.findMemberById(memberId)
    if (!member || member.corporateAccountId !== accountId) throw errors.notFound('Member not found')
    return corporateRepository.removeMember(memberId)
  },

  // Wallets
  async getWallet(accountId: string, actor: Actor) {
    await assertAccountAccess(accountId, actor, true)
    return corporateRepository.getOrCreateWallet(accountId)
  },

  // Trips
  async linkTrip(data: { tripId: string; corporateAccountId: string; memberId: string; costCentre?: string; approvedBy?: string }) {
    return corporateRepository.linkTrip(data)
  },

  async listCorporateTrips(accountId: string, actor: Actor, limit = 20, offset = 0) {
    await assertAccountAccess(accountId, actor, true)
    return corporateRepository.listCorporateTrips(accountId, limit, offset)
  },
}