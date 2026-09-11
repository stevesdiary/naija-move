import { fleetRepository } from './fleet.repository.js'
import { driversRepository } from '../drivers/drivers.repository.js'
import { vehiclesRepository } from '../vehicles/vehicles.repository.js'
import { errors } from '../../lib/errors.js'

export const fleetService = {
  async createOwner(userId: string, businessName?: string) {
    const existing = await fleetRepository.findOwnerByUserId(userId)
    if (existing) throw errors.conflict('Fleet owner profile already exists')
    return fleetRepository.createOwner({ userId, businessName })
  },

  async getOwner(userId: string) {
    const owner = await fleetRepository.findOwnerByUserId(userId)
    if (!owner) throw errors.notFound('Fleet owner not found')
    return owner
  },

  async updateOwner(userId: string, data: { businessName?: string; isVerified?: boolean }) {
    const owner = await fleetRepository.findOwnerByUserId(userId)
    if (!owner) throw errors.notFound('Fleet owner not found')
    return fleetRepository.updateOwner(owner.id, data)
  },

  async listOwners(limit = 20, offset = 0) {
    return fleetRepository.listOwners(limit, offset)
  },

  // Fleet Vehicles
  async addVehicle(fleetOwnerId: string, vehicleId: string) {
    const owner = await fleetRepository.findOwnerById(fleetOwnerId)
    if (!owner) throw errors.notFound('Fleet owner not found')
    // Verify vehicle exists
    const vehicle = await vehiclesRepository.findById(vehicleId)
    if (!vehicle) throw errors.notFound('Vehicle not found')
    return fleetRepository.addVehicle({ fleetOwnerId, vehicleId })
  },

  async listVehicles(fleetOwnerId: string) {
    return fleetRepository.listVehicles(fleetOwnerId)
  },

  async updateVehicleAvailability(fleetOwnerId: string, vehicleId: string, isAvailableForAssignment: boolean) {
    const vehicle = await fleetRepository.findVehicleById(vehicleId)
    if (!vehicle) throw errors.notFound('Fleet vehicle not found')
    if (vehicle.fleetOwnerId !== fleetOwnerId) throw errors.forbidden('Not your fleet vehicle')
    return fleetRepository.updateVehicleAvailability(vehicleId, isAvailableForAssignment)
  },

  async removeVehicle(fleetOwnerId: string, vehicleId: string) {
    const vehicle = await fleetRepository.findVehicleById(vehicleId)
    if (!vehicle) throw errors.notFound('Fleet vehicle not found')
    if (vehicle.fleetOwnerId !== fleetOwnerId) throw errors.forbidden('Not your fleet vehicle')
    return fleetRepository.removeVehicle(vehicleId)
  },

  // Assignments
  async createAssignment(fleetOwnerId: string, data: { fleetVehicleId: string; driverId: string; startDate: Date; endDate?: Date }) {
    const vehicle = await fleetRepository.findVehicleById(data.fleetVehicleId)
    if (!vehicle) throw errors.notFound('Fleet vehicle not found')
    if (vehicle.fleetOwnerId !== fleetOwnerId) throw errors.forbidden('Not your fleet vehicle')
    if (!vehicle.isAvailableForAssignment) throw errors.unprocessable('Vehicle not available for assignment')

    const driver = await driversRepository.findById(data.driverId)
    if (!driver) throw errors.notFound('Driver not found')

    const assignment = await fleetRepository.createAssignment(data)
    await fleetRepository.updateVehicleAvailability(data.fleetVehicleId, false)
    return assignment
  },

  async listAssignments(fleetOwnerId: string) {
    return fleetRepository.listAssignments(fleetOwnerId)
  },

  async endAssignment(fleetOwnerId: string, assignmentId: string) {
    const assignment = await fleetRepository.findAssignmentById(assignmentId)
    if (!assignment) throw errors.notFound('Assignment not found')

    const vehicle = await fleetRepository.findVehicleById(assignment.fleetVehicleId)
    if (!vehicle || vehicle.fleetOwnerId !== fleetOwnerId) throw errors.forbidden('Not your fleet vehicle')

    await fleetRepository.endAssignment(assignmentId)
    await fleetRepository.updateVehicleAvailability(assignment.fleetVehicleId, true)
    return { success: true }
  },

  async updateAssignment(fleetOwnerId: string, assignmentId: string, data: { endDate?: Date; isActive?: boolean }) {
    const assignment = await fleetRepository.findAssignmentById(assignmentId)
    if (!assignment) throw errors.notFound('Assignment not found')

    const vehicle = await fleetRepository.findVehicleById(assignment.fleetVehicleId)
    if (!vehicle || vehicle.fleetOwnerId !== fleetOwnerId) throw errors.forbidden('Not your fleet vehicle')

    return fleetRepository.updateAssignment(assignmentId, data)
  },
}