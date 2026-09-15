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

  /**
   * Debit + credit are written in one transaction — a half-posted pair must never survive a crash.
   *
   * Wallet balances are derived per (account, actorId), so a pair whose two legs
   * belong to different owners — e.g. a rider_wallet debit vs a driver_payable
   * credit — must attribute each leg to its own owner. Pass `debitActorId` /
   * `creditActorId` for that; both default to `actorId`.
   */
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
    debitActorId?: string
    creditActorId?: string
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
        actorId: params.debitActorId ?? params.actorId,
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
        actorId: params.creditActorId ?? params.actorId,
        metadata: params.metadata,
      }, tx)

      return { debit, credit }
    }
    return exec ? post(exec) : db.transaction(post)
  },

  /**
   * Post the accounting for a completed trip, by payment method. Idempotent:
   * skips if the trip already has ledger entries.
   *
   *  - card:            posted when the rider's charge succeeds (payments webhook), not here.
   *  - wallet/corporate: rider's wallet pays the fare — split into platform_revenue + driver_payable.
   *  - cash:            driver already holds the fare, so they owe the platform its commission
   *                     (debit driver_payable, credit platform_revenue). This nets against any
   *                     card/wallet payouts owed to the same driver at settlement.
   *  - bank_transfer:   left for a dedicated reconciliation path (not posted here).
   *
   * driver_payable is aggregated by actorId at settlement, so the driver leg's actor is the driver.
   */
  async recordTripEarnings(trip: {
    id: string
    paymentMethod: string | null
    finalFareKobo?: number | null
    estimatedFareKobo?: number | null
    platformFeeKobo?: number | null
    driverAmountKobo?: number | null
    riderId: string
    driverId: string | null
  }): Promise<{ posted: boolean; reason?: string }> {
    if (!trip.driverId) return { posted: false, reason: 'no_driver' }
    const method = trip.paymentMethod
    if (method === 'card') return { posted: false, reason: 'card_settles_on_payment' }
    if (method !== 'cash' && method !== 'wallet' && method !== 'corporate_wallet') {
      return { posted: false, reason: `unsupported_method:${method}` }
    }

    const fareKobo = trip.finalFareKobo ?? trip.estimatedFareKobo ?? 0
    const platformFeeKobo = trip.platformFeeKobo ?? 0
    const driverAmountKobo = trip.driverAmountKobo ?? Math.max(0, fareKobo - platformFeeKobo)
    if (fareKobo <= 0) return { posted: false, reason: 'zero_fare' }

    // Idempotent — never post a trip's earnings twice.
    const existing = await this.getEntriesForReference(trip.id, 'trip')
    if (existing.length > 0) return { posted: false, reason: 'already_posted' }

    const correlationId = uuid()
    const driverId = trip.driverId
    await db.transaction(async (tx) => {
      if (method === 'cash') {
        if (platformFeeKobo > 0) {
          await this.createDoubleEntry({
            correlationId,
            debitAccount: 'driver_payable',
            creditAccount: 'platform_revenue',
            amountKobo: platformFeeKobo,
            currency: 'NGN',
            description: `Platform commission on cash trip ${trip.id}`,
            referenceId: trip.id,
            referenceType: 'trip',
            debitActorId: driverId,
            metadata: { driverId, method },
          }, tx)
        }
      } else {
        const riderAccount = method === 'corporate_wallet' ? 'corporate_wallet' : 'rider_wallet'
        if (platformFeeKobo > 0) {
          await this.createDoubleEntry({
            correlationId,
            debitAccount: riderAccount,
            creditAccount: 'platform_revenue',
            amountKobo: platformFeeKobo,
            currency: 'NGN',
            description: `Platform fee for trip ${trip.id}`,
            referenceId: trip.id,
            referenceType: 'trip',
            debitActorId: trip.riderId,
            metadata: { driverId, method },
          }, tx)
        }
        if (driverAmountKobo > 0) {
          await this.createDoubleEntry({
            correlationId: `${correlationId}_driver`,
            debitAccount: riderAccount,
            creditAccount: 'driver_payable',
            amountKobo: driverAmountKobo,
            currency: 'NGN',
            description: `Driver payable for trip ${trip.id}`,
            referenceId: trip.id,
            referenceType: 'trip',
            debitActorId: trip.riderId,
            creditActorId: driverId,
            metadata: { driverId, method },
          }, tx)
        }
      }
    })
    return { posted: true }
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