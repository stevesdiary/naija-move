import { db } from '../../db/index.js'
import { ledgerEntries, wallets, walletTransactions } from '../../db/schema/index.js'
import { eq, and, sum, sql } from 'drizzle-orm'
import { v4 as uuid } from 'uuid'
import { ledgerAccountEnum } from '../../db/schema/ledger.js'

export const ledgerRepository = {
  async createEntry(data: {
    correlationId: string
    type: 'debit' | 'credit'
    account: string
    amountKobo: number
    currency: string
    description: string
    referenceId: string
    referenceType: string
    actorId?: string
    metadata?: Record<string, unknown>
  }) {
    const id = uuid()
    await db.insert(ledgerEntries).values({
      id,
      correlationId: data.correlationId,
      type: data.type,
      account: data.account as any,
      amountKobo: data.amountKobo,
      currency: data.currency,
      description: data.description,
      referenceId: data.referenceId,
      referenceType: data.referenceType,
      actorId: data.actorId,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
    })
    return db.query.ledgerEntries.findFirst({ where: eq(ledgerEntries.id, id) })
  },

  async createDoubleEntry(params: {
    correlationId: string
    debitAccount: string
    creditAccount: string
    amountKobo: number
    currency: string
    description: string
    referenceId: string
    referenceType: string
    actorId?: string
    metadata?: Record<string, unknown>
  }) {
    const debit = await this.createEntry({
      correlationId: params.correlationId,
      type: 'debit',
      account: params.debitAccount,
      amountKobo: params.amountKobo,
      currency: params.currency,
      description: params.description,
      referenceId: params.referenceId,
      referenceType: params.referenceType,
      actorId: params.actorId,
      metadata: params.metadata,
    })

    const credit = await this.createEntry({
      correlationId: params.correlationId,
      type: 'credit',
      account: params.creditAccount,
      amountKobo: params.amountKobo,
      currency: params.currency,
      description: params.description,
      referenceId: params.referenceId,
      referenceType: params.referenceType,
      actorId: params.actorId,
      metadata: params.metadata,
    })

    return { debit, credit }
  },

  async getEntriesForReference(referenceId: string, referenceType: string) {
    return db.query.ledgerEntries.findMany({
      where: and(eq(ledgerEntries.referenceId, referenceId), eq(ledgerEntries.referenceType, referenceType)),
      orderBy: (ledgerEntries, { asc }) => [asc(ledgerEntries.createdAt)],
    })
  },

  async getEntriesByCorrelationId(correlationId: string) {
    return db.query.ledgerEntries.findMany({
      where: eq(ledgerEntries.correlationId, correlationId),
      orderBy: (ledgerEntries, { asc }) => [asc(ledgerEntries.createdAt)],
    })
  },

  // Wallet management
  async getOrCreateWallet(ownerId: string, ownerType: 'rider' | 'driver' | 'corporate' | 'fleet_owner') {
    let wallet = await db.query.wallets.findFirst({
      where: and(eq(wallets.ownerId, ownerId), eq(wallets.ownerType, ownerType)),
    })

    if (!wallet) {
      const id = uuid()
      await db.insert(wallets).values({ id, ownerId, ownerType: ownerType as any })
      wallet = await db.query.wallets.findFirst({ where: eq(wallets.id, id) })
    }

    return wallet
  },

  async getWalletBalance(ownerId: string, ownerType: 'rider' | 'driver' | 'corporate' | 'fleet_owner') {
    const wallet = await this.getOrCreateWallet(ownerId, ownerType)
    if (!wallet) return { balanceKobo: 0, currency: 'NGN' }

    // Sum all credits - debits for this wallet
    const entries = await db.query.ledgerEntries.findMany({
      where: and(
        eq(ledgerEntries.account, this.getLedgerAccountForWallet(ownerType)),
        // Filter by actorId for this specific wallet owner
      ),
    })

    let balance = 0
    for (const entry of entries) {
      if (entry.actorId === ownerId) {
        if (entry.type === 'credit') balance += entry.amountKobo
        else balance -= entry.amountKobo
      }
    }

    return { balanceKobo: balance, currency: 'NGN' }
  },

  async getWalletTransactions(walletId: string, limit = 50, offset = 0) {
    return db.query.walletTransactions.findMany({
      where: eq(walletTransactions.walletId, walletId),
      orderBy: (walletTransactions, { desc }) => [desc(walletTransactions.createdAt)],
      limit,
      offset,
    })
  },

  async createWalletTransaction(data: {
    walletId: string
    ledgerEntryId: string
    type: 'credit' | 'debit'
    amountKobo: number
    description: string
    referenceId?: string
    referenceType?: string
  }) {
    const id = uuid()
    await db.insert(walletTransactions).values({
      id,
      walletId: data.walletId,
      ledgerEntryId: data.ledgerEntryId,
      type: data.type,
      amountKobo: data.amountKobo,
      description: data.description,
      referenceId: data.referenceId,
      referenceType: data.referenceType,
    })
    return db.query.walletTransactions.findFirst({ where: eq(walletTransactions.id, id) })
  },

getLedgerAccountForWallet(ownerType: 'rider' | 'driver' | 'corporate' | 'fleet_owner'): typeof ledgerAccountEnum.enumValues[number] {
    switch (ownerType) {
      case 'rider': return 'rider_wallet'
      case 'driver': return 'driver_payable'
      case 'corporate': return 'corporate_wallet'
      case 'fleet_owner': return 'driver_payable'
      default: return 'rider_wallet'
    }
  },
}