import { driversRepository } from './drivers.repository.js'
import { errors } from '../../lib/errors.js'
import { identityRepository } from '../identity/identity.repository.js'
import { issueSession } from '../identity/identity.service.js'

export const driversService = {
  /** A rider opts in to driving: create the profile, switch the account role, and re-issue tokens. */
  async register(userId: string) {
    const existing = await driversRepository.findByUserId(userId)
    if (existing) throw errors.conflict('Driver profile already exists')
    const driver = await driversRepository.create(userId)
    await identityRepository.setRole(userId, 'driver')
    const { accessToken, refreshToken } = await issueSession(userId, 'driver')
    return { driver, accessToken, refreshToken }
  },

  async getProfile(userId: string) {
    const driver = await driversRepository.findByUserId(userId)
    if (!driver) throw errors.notFound('Driver profile not found')
    return driver
  },

  async setAvailability(userId: string, isOnline: boolean) {
    const driver = await driversRepository.findByUserId(userId)
    if (!driver) throw errors.notFound('Driver profile not found')
    if (driver.status !== 'approved') throw errors.forbidden('Driver must be approved to go online')
    return driversRepository.update(driver.id, { isOnline })
  },

  async updateLocation(userId: string, lat: number, lng: number) {
    const driver = await driversRepository.findByUserId(userId)
    if (!driver) throw errors.notFound('Driver profile not found')
    return driversRepository.update(driver.id, {
      currentLat: lat,
      currentLng: lng,
    })
  },

  async getEarnings(userId: string) {
    const driver = await driversRepository.findByUserId(userId)
    if (!driver) throw errors.notFound('Driver profile not found')
    // TODO: Phase 8 - calculate from ledger
    return { totalEarningsKobo: 0, thisWeekKobo: 0, thisMonthKobo: 0, pendingPayoutKobo: 0 }
  },

  async getHeatmap(userId: string) {
    // TODO: Phase 6 - implement heatmap
    return { zones: [], message: 'Heatmap - Phase 6' }
  },

  // Documents
  async listDocuments(userId: string) {
    const driver = await driversRepository.findByUserId(userId)
    if (!driver) throw errors.notFound('Driver profile not found')
    return driversRepository.listDocuments(driver.id)
  },

  async uploadDocument(userId: string, data: { type: string; fileUrl?: string; referenceNumber?: string; expiresAt?: Date }) {
    const driver = await driversRepository.findByUserId(userId)
    if (!driver) throw errors.notFound('Driver profile not found')
    return driversRepository.createDocument(driver.id, data)
  },

  async getStatusHistory(userId: string) {
    const driver = await driversRepository.findByUserId(userId)
    if (!driver) throw errors.notFound('Driver profile not found')
    return driversRepository.getStatusHistory(driver.id)
  },

  // Admin functions
  async adminList(filters?: { status?: string; limit?: number; offset?: number }) {
    return driversRepository.listAll(filters)
  },

  async adminApprove(driverId: string, adminId: string) {
    return driversRepository.updateStatus(driverId, 'approved', 'Approved by admin', adminId)
  },

  async adminSuspend(driverId: string, adminId: string, reason: string) {
    return driversRepository.updateStatus(driverId, 'suspended', reason, adminId)
  },

  async adminReject(driverId: string, adminId: string, reason: string) {
    return driversRepository.updateStatus(driverId, 'rejected', reason, adminId)
  },
}