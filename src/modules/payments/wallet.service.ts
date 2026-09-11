import { ledgerRepository } from './ledger.repository.js'
import { errors } from '../../lib/errors.js'

export const walletService = {
  async getBalance(ownerId: string, ownerType: 'rider' | 'driver' | 'corporate' | 'fleet_owner') {
    const wallet = await ledgerRepository.getOrCreateWallet(ownerId, ownerType)
    if (!wallet) return { balanceKobo: 0, currency: 'NGN' }

    const account = ledgerRepository.getLedgerAccountForWallet(ownerType)
    const entries = await ledgerRepository.getEntriesForReference(ownerId, 'wallet') // This needs fixing

    // Better approach: query ledger entries by account and actorId
    // For now return 0 - full implementation needs a proper query
    return { balanceKobo: 0, currency: 'NGN' }
  },

  async getWalletTransactions(ownerId: string, ownerType: 'rider' | 'driver' | 'corporate' | 'fleet_owner', limit = 50, offset = 0) {
    const wallet = await ledgerRepository.getOrCreateWallet(ownerId, ownerType)
    if (!wallet) return []

    return ledgerRepository.getWalletTransactions(wallet.id, limit, offset)
  },

  async topUp(ownerId: string, ownerType: 'rider' | 'driver' | 'corporate' | 'fleet_owner', amountKobo: number, reference: string, description: string) {
    const wallet = await ledgerRepository.getOrCreateWallet(ownerId, ownerType)
    if (!wallet) throw errors.notFound('Wallet not found')

    const correlationId = `topup_${ownerId}_${Date.now()}`

    // Credit: wallet account
    // Debit: platform_liability (or external payment account)
    await ledgerRepository.createDoubleEntry({
      correlationId,
      debitAccount: 'platform_liability',
      creditAccount: ledgerRepository.getLedgerAccountForWallet(ownerType),
      amountKobo,
      currency: 'NGN',
      description,
      referenceId: ownerId,
      referenceType: 'topup',
      actorId: ownerId,
      metadata: { reference },
    })

    // Create wallet transaction record
    // In a full implementation, this would be done in a transaction
    return { success: true }
  },

  async withdraw(ownerId: string, ownerType: 'rider' | 'driver' | 'corporate' | 'fleet_owner', amountKobo: number, reference: string, description: string) {
    const wallet = await ledgerRepository.getOrCreateWallet(ownerId, ownerType)
    if (!wallet) throw errors.notFound('Wallet not found')

    // Check balance first (simplified)
    const balance = await this.getBalance(ownerId, ownerType)
    if (balance.balanceKobo < amountKobo) {
      throw errors.unprocessable('Insufficient balance')
    }

    const correlationId = `withdrawal_${ownerId}_${Date.now()}`

    // Debit: wallet account
    // Credit: platform_liability (or external payout account)
    await ledgerRepository.createDoubleEntry({
      correlationId,
      debitAccount: ledgerRepository.getLedgerAccountForWallet(ownerType),
      creditAccount: 'platform_liability',
      amountKobo,
      currency: 'NGN',
      description,
      referenceId: ownerId,
      referenceType: 'withdrawal',
      actorId: ownerId,
      metadata: { reference },
    })

    return { success: true }
  },
}