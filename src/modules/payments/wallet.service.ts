import { ledgerRepository } from './ledger.repository.js'
import { errors } from '../../lib/errors.js'
import { db } from '../../db/index.js'

function assertAmount(amountKobo: number) {
  if (!Number.isInteger(amountKobo) || amountKobo <= 0) throw errors.badRequest('amountKobo must be a positive integer')
}

export const walletService = {
  async getBalance(ownerId: string, ownerType: 'rider' | 'driver' | 'corporate' | 'fleet_owner') {
    const result = await ledgerRepository.getWalletBalance(ownerId, ownerType)
    return result
  },

  async getWalletTransactions(ownerId: string, ownerType: 'rider' | 'driver' | 'corporate' | 'fleet_owner', limit = 50, offset = 0) {
    const wallet = await ledgerRepository.getOrCreateWallet(ownerId, ownerType)
    if (!wallet) return []

    return ledgerRepository.getWalletTransactions(wallet.id, limit, offset)
  },

  async topUp(ownerId: string, ownerType: 'rider' | 'driver' | 'corporate' | 'fleet_owner', amountKobo: number, reference: string, description: string) {
    assertAmount(amountKobo)
    const wallet = await ledgerRepository.getOrCreateWallet(ownerId, ownerType)
    if (!wallet) throw errors.notFound('Wallet not found')

    const correlationId = `topup_${ownerId}_${Date.now()}`

    const balanceKobo = await db.transaction(async (tx) => {
      await ledgerRepository.lockWallet(wallet.id, tx)
      const { credit } = await ledgerRepository.createDoubleEntry({
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
      }, tx)
      if (!credit) throw errors.internal('Ledger credit was not written')
      await ledgerRepository.createWalletTransaction({
        walletId: wallet.id,
        ledgerEntryId: credit.id,
        type: 'credit',
        amountKobo,
        description,
        referenceId: ownerId,
        referenceType: 'topup',
      }, tx)
      return (await ledgerRepository.getWalletBalance(ownerId, ownerType, tx)).balanceKobo
    })

    return { success: true, balanceKobo }
  },

  async withdraw(ownerId: string, ownerType: 'rider' | 'driver' | 'corporate' | 'fleet_owner', amountKobo: number, reference: string, description: string) {
    assertAmount(amountKobo)
    const wallet = await ledgerRepository.getOrCreateWallet(ownerId, ownerType)
    if (!wallet) throw errors.notFound('Wallet not found')

    const correlationId = `withdrawal_${ownerId}_${Date.now()}`

    // Balance check and debit happen under a row lock, so two concurrent
    // withdrawals can't both pass the check against the same balance.
    const balanceKobo = await db.transaction(async (tx) => {
      await ledgerRepository.lockWallet(wallet.id, tx)
      const balance = await ledgerRepository.getWalletBalance(ownerId, ownerType, tx)
      if (balance.balanceKobo < amountKobo) throw errors.unprocessable('Insufficient balance')

      const { debit } = await ledgerRepository.createDoubleEntry({
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
      }, tx)
      if (!debit) throw errors.internal('Ledger debit was not written')
      await ledgerRepository.createWalletTransaction({
        walletId: wallet.id,
        ledgerEntryId: debit.id,
        type: 'debit',
        amountKobo,
        description,
        referenceId: ownerId,
        referenceType: 'withdrawal',
      }, tx)
      return (await ledgerRepository.getWalletBalance(ownerId, ownerType, tx)).balanceKobo
    })

    return { success: true, balanceKobo }
  },
}