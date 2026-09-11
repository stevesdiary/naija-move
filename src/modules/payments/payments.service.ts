import { paystack } from '../../providers/payments.js'
import { pricingService } from '../pricing/pricing.service.js'
import { ledgerRepository } from './ledger.repository.js'
import { ridesService } from '../rides/rides.service.js'
import { errors } from '../../lib/errors.js'
import { assertIdempotent } from '../../lib/idempotency.js'
import { v4 as uuid } from 'uuid'

const PLATFORM_FEE_PERCENT = 0.08 // 8%

export const paymentsService = {
  async initializePayment(params: {
    riderId: string
    tripId: string
    amountKobo: number
    email: string
    metadata?: Record<string, unknown>
  }) {
    const idempotencyKey = `payment:${params.tripId}:${params.riderId}`
    await assertIdempotent(idempotencyKey)

    const reference = `trip_${params.tripId}_${Date.now()}`

    const result = await paystack.initialize(
      params.email,
      params.amountKobo,
      reference,
      { ...params.metadata, tripId: params.tripId, riderId: params.riderId }
    )

    // Store payment intent (simplified - in production use repository)
    return {
      authorizationUrl: result.authorization_url,
      accessCode: result.access_code,
      reference: result.reference,
    }
  },

  async verifyPayment(reference: string) {
    const result = await paystack.verify(reference)
    return result
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
    const amountKobo = data.amount
    const metadata = data.metadata || {}

    // Find trip from metadata
    const tripId = metadata.tripId
    const riderId = metadata.riderId

    if (!tripId || !riderId) {
      console.error('Missing tripId or riderId in payment metadata', { reference, metadata })
      return
    }

    const trip = await ridesService.getTrip(tripId)
    if (!trip) throw errors.notFound('Trip not found')

    // Calculate platform fee and driver amount
    const platformFeeKobo = Math.round(amountKobo * PLATFORM_FEE_PERCENT)
    const driverAmountKobo = amountKobo - platformFeeKobo

    // Create double-entry ledger for trip payment
    const correlationId = uuid()
    
    // Debit: rider_wallet (rider pays)
    // Credit: platform_revenue (platform fee)
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
    })

    // Debit: rider_wallet (remaining amount)
    // Credit: driver_payable (driver earnings)
    await ledgerRepository.createDoubleEntry({
      correlationId: `${correlationId}_driver`,
      debitAccount: 'rider_wallet',
      creditAccount: 'driver_payable',
      amountKobo: driverAmountKobo,
      currency: 'NGN',
      description: `Driver payable for trip ${tripId}`,
      referenceId: tripId,
      referenceType: 'trip',
      actorId: riderId,
      metadata: { paymentReference: reference, driverId: trip.driverId },
    })

    // Update trip with final fare
    await ridesService.completeTrip(tripId, trip.driverId!, trip.distanceMeters!, trip.durationSeconds!)

    // Create wallet transactions for rider
    const riderWallet = await ledgerRepository.getOrCreateWallet(riderId, 'rider')
    if (riderWallet) {
      // This would be done in a more complete implementation
    }
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
    // Payout to driver completed
    const reference = data.reference
    console.log(`Transfer successful: ${reference}`)
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