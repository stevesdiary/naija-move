import { corporateRepository } from './corporate.repository.js'
import { errors } from '../../lib/errors.js'

export const corporateService = {
  async createAccount(data: { name: string; email: string; phone?: string }) {
    const existing = await corporateRepository.findAccountByEmail(data.email)
    if (existing) throw errors.conflict('Corporate account with this email already exists')
    return corporateRepository.createAccount(data)
  },

  async getAccount(accountId: string) {
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

  async listMembers(accountId: string) {
    return corporateRepository.listMembers(accountId)
  },

  async updateMember(memberId: string, data: { role?: string; monthlyBudgetKobo?: number; isActive?: boolean }) {
    return corporateRepository.updateMember(memberId, data)
  },

  async removeMember(memberId: string) {
    return corporateRepository.removeMember(memberId)
  },

  // Wallets
  async getWallet(accountId: string) {
    return corporateRepository.getOrCreateWallet(accountId)
  },

  // Trips
  async linkTrip(data: { tripId: string; corporateAccountId: string; memberId: string; costCentre?: string; approvedBy?: string }) {
    return corporateRepository.linkTrip(data)
  },

  async listCorporateTrips(accountId: string, limit = 20, offset = 0) {
    return corporateRepository.listCorporateTrips(accountId, limit, offset)
  },
}