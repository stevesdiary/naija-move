import type { FastifyInstance } from 'fastify'
import { authenticate, authorize } from '../../lib/rbac.js'
import {
  createOwnerSchema,
  updateOwnerSchema,
  addVehicleSchema,
  updateVehicleAvailabilitySchema,
  createAssignmentSchema,
  updateAssignmentSchema,
  type CreateOwnerBody,
  type UpdateOwnerBody,
  type AddVehicleBody,
  type UpdateVehicleAvailabilityBody,
  type CreateAssignmentBody,
  type UpdateAssignmentBody,
} from './fleet.schema.js'
import { fleetService } from './fleet.service.js'

export async function fleetRoutes(app: FastifyInstance) {
  // Fleet Owner: create profile
  app.post<{ Body: CreateOwnerBody }>('/', { preHandler: [authenticate] }, async (req) => {
    const body = createOwnerSchema.parse(req.body)
    return fleetService.createOwner(req.user.sub, body.businessName)
  })

  // Fleet Owner: get my profile
  app.get('/me', { preHandler: [authenticate] }, async (req) => {
    return fleetService.getOwner(req.user.sub)
  })

  // Fleet Owner: update profile
  app.put<{ Body: UpdateOwnerBody }>('/me', { preHandler: [authenticate] }, async (req) => {
    const body = updateOwnerSchema.parse(req.body)
    return fleetService.updateOwner(req.user.sub, body)
  })

  // Fleet Owner: list my vehicles
  app.get('/vehicles', { preHandler: [authenticate] }, async (req) => {
    const owner = await fleetService.getOwner(req.user.sub)
    return fleetService.listVehicles(owner.id)
  })

  // Fleet Owner: add vehicle
  app.post<{ Body: AddVehicleBody }>('/vehicles', { preHandler: [authenticate] }, async (req) => {
    const body = addVehicleSchema.parse(req.body)
    const owner = await fleetService.getOwner(req.user.sub)
    return fleetService.addVehicle(owner.id, body.vehicleId)
  })

  // Fleet Owner: update vehicle availability
  app.put<{ Body: UpdateVehicleAvailabilityBody; Params: { vehicleId: string } }>(
    '/vehicles/:vehicleId/availability',
    { preHandler: [authenticate] },
    async (req) => {
      const { vehicleId } = req.params
      const body = updateVehicleAvailabilitySchema.parse(req.body)
      const owner = await fleetService.getOwner(req.user.sub)
      return fleetService.updateVehicleAvailability(owner.id, vehicleId, body.isAvailableForAssignment)
    },
  )

  // Fleet Owner: remove vehicle
  app.delete('/vehicles/:vehicleId', { preHandler: [authenticate] }, async (req) => {
    const { vehicleId } = req.params as { vehicleId: string }
    const owner = await fleetService.getOwner(req.user.sub)
    return fleetService.removeVehicle(owner.id, vehicleId)
  })

  // Assignments
  app.post<{ Body: CreateAssignmentBody }>('/assignments', { preHandler: [authenticate] }, async (req) => {
    const body = createAssignmentSchema.parse(req.body)
    const owner = await fleetService.getOwner(req.user.sub)
    return fleetService.createAssignment(owner.id, {
      ...body,
      startDate: new Date(body.startDate),
      endDate: body.endDate ? new Date(body.endDate) : undefined,
    })
  })

  app.get('/assignments', { preHandler: [authenticate] }, async (req) => {
    const owner = await fleetService.getOwner(req.user.sub)
    return fleetService.listAssignments(owner.id)
  })

  app.put<{ Body: UpdateAssignmentBody; Params: { assignmentId: string } }>(
    '/assignments/:assignmentId',
    { preHandler: [authenticate] },
    async (req) => {
      const { assignmentId } = req.params
      const body = updateAssignmentSchema.parse(req.body)
      const owner = await fleetService.getOwner(req.user.sub)
      return fleetService.updateAssignment(owner.id, assignmentId, {
        endDate: body.endDate ? new Date(body.endDate) : undefined,
        isActive: body.isActive,
      })
    },
  )

  app.post('/assignments/:assignmentId/end', { preHandler: [authenticate] }, async (req) => {
    const { assignmentId } = req.params as { assignmentId: string }
    const owner = await fleetService.getOwner(req.user.sub)
    return fleetService.endAssignment(owner.id, assignmentId)
  })

  // Admin: list all fleet owners
  app.get('/admin/all', { preHandler: [authenticate, authorize('admin')] }, async (req) => {
    const { limit, offset } = req.query as { limit?: string; offset?: string }
    return fleetService.listOwners(limit ? parseInt(limit) : 20, offset ? parseInt(offset) : 0)
  })
}