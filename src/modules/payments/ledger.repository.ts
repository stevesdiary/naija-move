import { db, type Tx } from '../../db/index.js'
import { ledgerEntries, wallets, walletTransactions } from '../../db/schema/index.js'
import { eq, and, sum, sql } from 'drizzle-orm'
import { v4 as uuid } from 'uuid'
import { ledgerAccountEnum } from '../../db/schema/ledger.js'

type Executor = typeof db | Tx

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
  }, exec: Executor = db) {
    const id = uuid()
    await exec.insert(ledgerEntries).values({
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
    return exec.query.ledgerEntries.findFirst({ where: eq(ledgerEntries.id, id) })
  },

  /** Debit + credit are written in one transaction — a half-posted pair must never survive a crash. */
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
  }, exec?: Tx) {
    if (!Number.isInteger(params.amountKobo) || params.amountKobo <= 0) {
      throw new Error(`Ledger amounts must be positive integers, got ${params.amountKobo}`)
    }
    const post = async (tx: Executor) => {
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
      }, tx)

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
      }, tx)

      return { debit, credit }
    }
    return exec ? post(exec) : db.transaction(post)
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

  async getWalletBalance(ownerId: string, ownerType: 'rider' | 'driver' | 'corporate' | 'fleet_owner', exec: Executor = db) {
    await this.getOrCreateWallet(ownerId, ownerType)
    const account = this.getLedgerAccountForWallet(ownerType)

    const result = await exec
      .select({
        credits: sql<number>`COALESCE(SUM(CASE WHEN type = 'credit' THEN amount_kobo ELSE 0 END), 0)`,
        debits: sql<number>`COALESCE(SUM(CASE WHEN type = 'debit' THEN amount_kobo ELSE 0 END), 0)`,
      })
      .from(ledgerEntries)
      .where(and(eq(ledgerEntries.account, account), eq(ledgerEntries.actorId, ownerId)))

    const row = result[0]
    const credits = Number(row?.credits ?? 0)
    const debits = Number(row?.debits ?? 0)
    return { balanceKobo: credits - debits, currency: 'NGN' }
  },

  async getWalletTransactions(walletId: string, limit = 50, offset = 0) {
    return db.query.walletTransactions.findMany({
      where: eq(walletTransactions.walletId, walletId),
      orderBy: (walletTransactions, { desc }) => [desc(walletTransactions.createdAt)],
      limit,
      offset,
    })
  },

  /** Serialises concurrent balance-changing operations on one wallet for the rest of the transaction. */
  async lockWallet(walletId: string, tx: Tx) {
    await tx.execute(sql`SELECT id FROM wallets WHERE id = ${walletId} FOR UPDATE`)
  },

  async createWalletTransaction(data: {
    walletId: string
    ledgerEntryId: string
    type: 'credit' | 'debit'
    amountKobo: number
    description: string
    referenceId?: string
    referenceType?: string
  }, exec: Executor = db) {
    const id = uuid()
    await exec.insert(walletTransactions).values({
      id,
      walletId: data.walletId,
      ledgerEntryId: data.ledgerEntryId,
      type: data.type,
      amountKobo: data.amountKobo,
      description: data.description,
      referenceId: data.referenceId,
      referenceType: data.referenceType,
    })
    return exec.query.walletTransactions.findFirst({ where: eq(walletTransactions.id, id) })
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