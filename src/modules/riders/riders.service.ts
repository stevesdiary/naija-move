import { ridersRepository } from './riders.repository.js'
import { errors } from '../../lib/errors.js'

export const ridersService = {
  async getProfile(userId: string) {
    let rider = await ridersRepository.findByUserId(userId)
    if (!rider) {
      rider = await ridersRepository.create(userId)
    }
    return rider
  },

  async updateProfile(userId: string, data: { preferredPaymentMethod?: string }) {
    const rider = await ridersRepository.findByUserId(userId)
    if (!rider) throw errors.notFound('Rider profile not found')
    return ridersRepository.update(rider.id, data)
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
}