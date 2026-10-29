import { ridersRepository } from './riders.repository.js'
import { errors } from '../../lib/errors.js'
import { identity } from '../../providers/identity.js'
import { encryptField, encryptJson } from '../../lib/field-encryption.js'

export const ridersService = {
  async getProfile(userId: string) {
    let rider = await ridersRepository.findByUserId(userId)
    if (!rider) {
      rider = await ridersRepository.create(userId)
    }
    return rider
  },

  /** Profile as the rider app needs it: rider stats + user name/phone/email. */
  async getFullProfile(userId: string) {
    await this.getProfile(userId)
    const profile = await ridersRepository.findProfileByUserId(userId)
    if (!profile) throw errors.notFound('Rider profile not found')
    return profile
  },

  async updateProfile(userId: string, data: { name?: string; email?: string; preferredPaymentMethod?: string }) {
    const rider = await ridersRepository.findByUserId(userId)
    if (!rider) throw errors.notFound('Rider profile not found')
    const { name, email, ...riderData } = data
    if (name !== undefined || email !== undefined) {
      await ridersRepository.updateUser(userId, { name, email })
    }
    if (riderData.preferredPaymentMethod !== undefined) {
      await ridersRepository.update(rider.id, riderData)
    }
    return this.getFullProfile(userId)
  },

  // Saved Places
  async listSavedPlaces(userId: string) {
    const rider = await ridersRepository.findByUserId(userId)
    if (!rider) throw errors.notFound('Rider profile not found')
    return ridersRepository.listSavedPlaces(rider.id)
  },

  async addSavedPlace(userId: string, data: { label: string; name: string; address: string; lat: number; lng: number }) {
    const rider = await ridersRepository.findByUserId(userId)
    if (!rider) throw errors.notFound('Rider profile not found')
    return ridersRepository.createSavedPlace(rider.id, data)
  },

  async removeSavedPlace(userId: string, placeId: string) {
    const rider = await ridersRepository.findByUserId(userId)
    if (!rider) throw errors.notFound('Rider profile not found')
    await ridersRepository.deleteSavedPlace(placeId, rider.id)
  },

  // Emergency Contacts
  async listEmergencyContacts(userId: string) {
    const rider = await ridersRepository.findByUserId(userId)
    if (!rider) throw errors.notFound('Rider profile not found')
    return ridersRepository.listEmergencyContacts(rider.id)
  },

  async addEmergencyContact(userId: string, data: { name: string; phone: string; shareTrips?: boolean }) {
    const rider = await ridersRepository.findByUserId(userId)
    if (!rider) throw errors.notFound('Rider profile not found')
    return ridersRepository.createEmergencyContact(rider.id, data)
  },

  async removeEmergencyContact(userId: string, contactId: string) {
    const rider = await ridersRepository.findByUserId(userId)
    if (!rider) throw errors.notFound('Rider profile not found')
    await ridersRepository.deleteEmergencyContact(contactId, rider.id)
  },

  // --- KYC / identity verification ---

  /** Non-sensitive view of a rider's KYC state (never returns the NIN itself). */
  async getKycStatus(userId: string) {
    const rider = await this.getProfile(userId)
    if (!rider) throw errors.notFound('Rider profile not found')
    return {
      kycStatus: rider.kycStatus,
      ninVerified: rider.ninVerified, // the NIN itself is stored encrypted and never echoed back
      verifiedAt: rider.kycVerifiedAt,
      provider: identity.isLive ? 'interswitch' : 'mock',
    }
  },

  /**
   * Verify a rider's NIN against the identity provider and record the outcome.
   * The full provider response (name, gender, DOB, phone, photo) is encrypted
   * at rest; a mismatch is stored as `rejected`, not silently discarded.
   */
  async verifyNinKyc(userId: string, input: { nin: string; firstName?: string; lastName?: string }) {
    const rider = await this.getProfile(userId)
    if (!rider) throw errors.notFound('Rider profile not found')
    if (rider.kycStatus === 'verified') {
      return { alreadyVerified: true, kycStatus: 'verified' as const }
    }

    const profile = await ridersRepository.findProfileByUserId(userId)
    // The user's own name is split into first/last for the match; explicit
    // overrides win so a two-part legal name can be corrected at verify time.
    const [profileFirst, ...profileRest] = (profile?.name ?? '').trim().split(/\s+/)
    const firstName = input.firstName ?? profileFirst
    const lastName = input.lastName ?? profileRest.join(' ')
    if (!firstName || !lastName) {
      throw errors.unprocessable('Could not determine your first and last name — provide firstName and lastName')
    }

    const result = await identity.verifyNin({ firstName, lastName, nin: input.nin })

    await ridersRepository.setKyc(rider.id, {
      kycStatus: result.verified ? 'verified' : 'rejected',
      nin: encryptField(result.nin),
      ninVerified: result.verified,
      ninData: encryptJson(result),
      kycVerifiedAt: result.verified ? new Date() : null,
    })

    return {
      verified: result.verified,
      kycStatus: result.verified ? ('verified' as const) : ('rejected' as const),
      matchStatus: result.matchStatus,
      provider: result.provider,
    }
  },
}