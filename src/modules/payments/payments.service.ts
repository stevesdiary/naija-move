import { paystack } from '../../providers/payments.js'
import { pricingService } from '../pricing/pricing.service.js'
import { ledgerRepository } from './ledger.repository.js'
import { walletService } from './wallet.service.js'
import { ridesService } from '../rides/rides.service.js'
import { ridesRepository } from '../rides/rides.repository.js'
import { errors } from '../../lib/errors.js'
import { assertIdempotent } from '../../lib/idempotency.js'
import { v4 as uuid } from 'uuid'
import { db } from '../../db/index.js'

const PLATFORM_FEE_PERCENT = 0.08 // 8%

export const paymentsService = {
  async initializePayment(params: { riderId: string; tripId: string; email: string }) {
    // Amount and ownership come from the trip row, never from the request.
    const trip = await ridesService.getTrip(params.tripId)
    if (trip.riderId !== params.riderId) throw errors.forbidden('Not your trip')
    if (trip.status !== 'completed') throw errors.unprocessable('Trip is not ready for payment')
    if (trip.paymentMethod !== 'card') throw errors.unprocessable('Trip is not payable by card')

    const amountKobo = (trip.finalFareKobo ?? trip.estimatedFareKobo ?? 0) + (trip.tipKobo ?? 0)
    if (amountKobo <= 0) throw errors.unprocessable('Trip has no payable amount')

    const idempotencyKey = `payment:${params.tripId}:${params.riderId}`
    await assertIdempotent(idempotencyKey)

    const reference = `trip_${params.tripId}_${Date.now()}`

    const result = await paystack.initialize(
      params.email,
      amountKobo,
      reference,
      { tripId: params.tripId, riderId: params.riderId },
    )

    return {
      authorizationUrl: result.authorization_url,
      accessCode: result.access_code,
      reference: result.reference,
    }
  },

  async initializeWalletTopup(params: {
    ownerId: string
    ownerType: 'rider' | 'driver' | 'corporate' | 'fleet_owner'
    amountKobo: number
    email: string
  }) {
    const idempotencyKey = `wallet_topup:${params.ownerId}:${params.amountKobo}:${Date.now()}`
    const reference = `topup_${params.ownerId}_${Date.now()}`

    const result = await paystack.initialize(
      params.email,
      params.amountKobo,
      reference,
      {
        context: 'wallet_topup',
        ownerId: params.ownerId,
        ownerType: params.ownerType,
      },
      // All channels enabled — card, bank_transfer, ussd, mobile_money
    )

    return {
      authorizationUrl: result.authorization_url,
      accessCode: result.access_code,
      reference: result.reference,
      channels: ['card', 'bank_transfer', 'ussd', 'mobile_money'],
    }
  },

  /**
   * References are minted here as `trip_<tripId>_<ts>` / `topup_<ownerId>_<ts>`,
   * so ownership can be checked from the reference itself before touching Paystack.
   */
  async verifyPayment(reference: string, actor: { userId: string; riderId?: string }) {
    const m = /^(trip|topup)_([0-9a-f-]{36})_\d+$/.exec(reference)
    if (!m) throw errors.notFound('Unknown payment reference')
    const [, kind, id] = m
    if (kind === 'topup') {
      if (id !== actor.userId) throw errors.forbidden('Not your payment')
    } else {
      const trip = await ridesService.getTrip(id)
      if (!actor.riderId || trip.riderId !== actor.riderId) throw errors.forbidden('Not your payment')
    }
    const result = await paystack.verify(reference)
    // Expose only what the client needs — not the payer's card/metadata blob.
    return { status: result.status, amount: result.amount, reference: result.reference, channel: result.channel }
  },

  async handlePaystackWebhook(payload: any, signature: string) {
    // Verify webhook signature (simplified - in production use crypto)
    const eventType = payload.event
    const data = payload.data

    // Idempotency key from provider reference
    const idempotencyKey = `paystack_webhook:${eventType}:${data.reference || data.id}`
    
    try {
      await assertIdempotent(idempotencyKey)
    } catch {
      // Already processed
      return { received: true, duplicate: true }
    }

    switch (eventType) {
      case 'charge.success':
        await this.handleChargeSuccess(data)
        break
      case 'charge.failed':
        await this.handleChargeFailed(data)
        break
      case 'transfer.success':
        await this.handleTransferSuccess(data)
        break
      case 'transfer.failed':
        await this.handleTransferFailed(data)
        break
      case 'refund.processed':
        await this.handleRefundProcessed(data)
        break
    }

    return { received: true }
  },

  async handleChargeSuccess(data: any) {
    const reference = data.reference
    const amountKobo = Number(data.amount)
    const metadata = data.metadata || {}

    if (data.status !== 'success' || !Number.isInteger(amountKobo) || amountKobo <= 0) {
      console.error('charge.success webhook with non-success status or bad amount', { reference, status: data.status })
      return
    }

    // --- Wallet top-up via card or bank transfer ---
    if (metadata.context === 'wallet_topup') {
      const { ownerId, ownerType } = metadata as { ownerId: string; ownerType: 'rider' | 'driver' | 'corporate' | 'fleet_owner' }
      if (!ownerId || !ownerType) {
        console.error('wallet_topup webhook missing ownerId/ownerType', { reference })
        return
      }
      await walletService.topUp(ownerId, ownerType, amountKobo, reference, `Wallet top-up via ${data.channel ?? 'card'}`)
      return
    }

    // --- Trip payment ---
    const tripId = metadata.tripId
    const riderId = metadata.riderId

    if (!tripId || !riderId) {
      console.error('Missing tripId or riderId in payment metadata', { reference, metadata })
      return
    }

    const trip = await ridesService.getTrip(tripId)
    if (!trip) throw errors.notFound('Trip not found')

    const expectedKobo = (trip.finalFareKobo ?? trip.estimatedFareKobo ?? 0) + (trip.tipKobo ?? 0)
    if (amountKobo !== expectedKobo) {
      console.error('charge.success amount does not match trip fare', { reference, tripId, amountKobo, expectedKobo })
      return
    }

    const platformFeeKobo = Math.round(amountKobo * PLATFORM_FEE_PERCENT)
    const driverAmountKobo = amountKobo - platformFeeKobo
    const correlationId = uuid()

    // Fee split and driver payable are one accounting event — post both or neither.
    await db.transaction(async (tx) => {
      await ledgerRepository.createDoubleEntry({
        correlationId,
        debitAccount: 'rider_wallet',
        creditAccount: 'platform_revenue',
        amountKobo: platformFeeKobo,
        currency: 'NGN',
        description: `Platform fee for trip ${tripId}`,
        referenceId: tripId,
        referenceType: 'trip',
        actorId: riderId,
        metadata: { paymentReference: reference },
      }, tx)

      await ledgerRepository.createDoubleEntry({
        correlationId: `${correlationId}_driver`,
        debitAccount: 'rider_wallet',
        creditAccount: 'driver_payable',
        amountKobo: driverAmountKobo,
        currency: 'NGN',
        description: `Driver payable for trip ${tripId}`,
        referenceId: tripId,
        referenceType: 'trip',
        // Debit leaves the rider's wallet; the payable is owed to the driver.
        // driver_payable is aggregated by actorId at settlement, so it must be the driver.
        debitActorId: riderId,
        creditActorId: trip.driverId ?? undefined,
        metadata: { paymentReference: reference, driverId: trip.driverId },
      }, tx)
    })

    // The driver already completed the trip; the ledger entries above are the record of payment.
    await ridesRepository.logEvent(tripId, 'payment_received', riderId, 'rider', {
      paymentReference: reference,
      amountKobo,
      channel: data.channel ?? 'card',
    })
  },

  async handleChargeFailed(data: any) {
    const reference = data.reference
    const metadata = data.metadata || {}
    const tripId = metadata.tripId

    if (tripId) {
      // Log failure, notify rider
      console.log(`Payment failed for trip ${tripId}: ${reference}`)
    }
  },

  async handleTransferSuccess(data: any) {
    // Paystack fires this for both outbound payouts AND inbound bank transfers
    // Inbound bank transfers (wallet top-up) carry context in metadata
    const reference = data.reference
    const metadata = data.metadata || {}

    if (metadata.context === 'wallet_topup') {
      const { ownerId, ownerType } = metadata as { ownerId: string; ownerType: 'rider' | 'driver' | 'corporate' | 'fleet_owner' }
      if (!ownerId || !ownerType) {
        console.error('wallet_topup transfer.success missing ownerId/ownerType', { reference })
        return
      }
      await walletService.topUp(ownerId, ownerType, data.amount, reference, 'Wallet top-up via bank transfer')
      return
    }

    // Outbound payout to driver — log confirmation
    console.log(`Outbound transfer successful: ${reference}`)
  },

  async handleTransferFailed(data: any) {
    // Payout to driver failed
    const reference = data.reference
    console.error(`Transfer failed: ${reference}`)
  },

  async handleRefundProcessed(data: any) {
    const reference = data.reference
    const amountKobo = data.amount
    console.log(`Refund processed: ${reference} - ${amountKobo} kobo`)
  },

  async refundPayment(reference: string, amountKobo?: number) {
    return paystack.refund(reference, amountKobo)
  },

  async createDriverPayout(driverId: string, amountKobo: number, settlementCycleId: string) {
    const idempotencyKey = `payout:${driverId}:${settlementCycleId}`
    await assertIdempotent(idempotencyKey)

    // In production, get driver's Paystack recipient code
    const recipientCode = `RCP_${driverId}` // placeholder

    const reference = `payout_${driverId}_${settlementCycleId}_${Date.now()}`

    const result = await paystack.transfer(
      amountKobo,
      recipientCode,
      reference,
      `Settlement payout for cycle ${settlementCycleId}`
    )

    // Create ledger entries for payout
    await ledgerRepository.createDoubleEntry({
      correlationId: uuid(),
      debitAccount: 'payout_clearing',
      creditAccount: 'driver_payable',
      amountKobo,
      currency: 'NGN',
      description: `Payout to driver ${driverId} for cycle ${settlementCycleId}`,
      referenceId: driverId,
      referenceType: 'payout',
      actorId: driverId,
      metadata: { transferReference: result.transfer_code, settlementCycleId },
    })

    return result
  },
}