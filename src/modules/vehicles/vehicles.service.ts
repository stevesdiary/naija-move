import { vehiclesRepository } from './vehicles.repository.js'
import { driversRepository } from '../drivers/drivers.repository.js'
import { errors } from '../../lib/errors.js'

export const vehiclesService = {
  async listMyVehicles(userId: string) {
    const driver = await driversRepository.findByUserId(userId)
    if (!driver) throw errors.notFound('Driver profile not found')
    return vehiclesRepository.findByDriverId(driver.id)
  },

  async getVehicle(userId: string, vehicleId: string) {
    const driver = await driversRepository.findByUserId(userId)
    if (!driver) throw errors.notFound('Driver profile not found')
    const vehicle = await vehiclesRepository.findById(vehicleId)
    if (!vehicle || vehicle.driverId !== driver.id) throw errors.notFound('Vehicle not found')
    return vehicle
  },

  async registerVehicle(userId: string, data: {
    plate: string
    make: string
    model: string
    year: number
    color: string
    category: 'economy' | 'comfort' | 'premium' | 'xl'
    seats: number
  }) {
    const driver = await driversRepository.findByUserId(userId)
    if (!driver) throw errors.notFound('Driver profile not found')
    return vehiclesRepository.create(driver.id, data)
  },

  async updateVehicle(userId: string, vehicleId: string, data: Partial<{
    make: string
    model: string
    year: number
    color: string
    plate: string
    category: 'economy' | 'comfort' | 'premium' | 'xl'
    seats: number
    isActive: boolean
  }>) {
    const driver = await driversRepository.findByUserId(userId)
    if (!driver) throw errors.notFound('Driver profile not found')
    return vehiclesRepository.update(vehicleId, driver.id, data)
  },

  async deleteVehicle(userId: string, vehicleId: string) {
    const driver = await driversRepository.findByUserId(userId)
    if (!driver) throw errors.notFound('Driver profile not found')
    await vehiclesRepository.delete(vehicleId, driver.id)
  },

  // Inspections
  async listInspections(userId: string, vehicleId: string) {
    await this.getVehicle(userId, vehicleId) // validates ownership
    return vehiclesRepository.listInspections(vehicleId)
  },

  async addInspection(userId: string, vehicleId: string, data: {
    status: string
    result?: string
    inspectedAt?: Date
    expiresAt?: Date
  }) {
    await this.getVehicle(userId, vehicleId) // validates ownership
    return vehiclesRepository.createInspection(vehicleId, data)
  },

  // Insurance
  async listInsurance(userId: string, vehicleId: string) {
    await this.getVehicle(userId, vehicleId) // validates ownership
    return vehiclesRepository.listInsurance(vehicleId)
  },

  async addInsurance(userId: string, vehicleId: string, data: {
    provider: string
    policyNumber: string
    expiresAt: Date
    documentUrl?: string
  }) {
    await this.getVehicle(userId, vehicleId) // validates ownership
    return vehiclesRepository.createInsurance(vehicleId, data)
  },
}