import type { FastifyInstance } from 'fastify'
import { authenticate, authorize } from '../../lib/rbac.js'
import {
  vehicleRegisterSchema,
  updateVehicleSchema,
  inspectionSchema,
  insuranceSchema,
  type VehicleRegisterBody,
  type UpdateVehicleBody,
  type InspectionBody,
  type InsuranceBody,
} from './vehicles.schema.js'
import { vehiclesService } from './vehicles.service.js'

export async function vehicleRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: [authenticate, authorize('driver')] }, async (req) => {
    return vehiclesService.listMyVehicles(req.user.sub)
  })

  app.post<{ Body: VehicleRegisterBody }>('/', { preHandler: [authenticate, authorize('driver')] }, async (req) => {
    const body = vehicleRegisterSchema.parse(req.body)
    return vehiclesService.registerVehicle(req.user.sub, body)
  })

  app.get('/:vehicleId', { preHandler: [authenticate, authorize('driver')] }, async (req) => {
    const { vehicleId } = req.params as { vehicleId: string }
    return vehiclesService.getVehicle(req.user.sub, vehicleId)
  })

  app.put<{ Body: UpdateVehicleBody; Params: { vehicleId: string } }>(
    '/:vehicleId',
    { preHandler: [authenticate, authorize('driver')] },
    async (req) => {
      const { vehicleId } = req.params
      const body = updateVehicleSchema.parse(req.body)
      return vehiclesService.updateVehicle(req.user.sub, vehicleId, body)
    },
  )

  app.delete('/:vehicleId', { preHandler: [authenticate, authorize('driver')] }, async (req) => {
    const { vehicleId } = req.params as { vehicleId: string }
    await vehiclesService.deleteVehicle(req.user.sub, vehicleId)
    return { message: 'Vehicle removed' }
  })

  // Inspections
  app.get('/:vehicleId/inspections', { preHandler: [authenticate, authorize('driver')] }, async (req) => {
    const { vehicleId } = req.params as { vehicleId: string }
    return vehiclesService.listInspections(req.user.sub, vehicleId)
  })

  app.post<{ Body: InspectionBody; Params: { vehicleId: string } }>(
    '/:vehicleId/inspections',
    { preHandler: [authenticate, authorize('driver')] },
    async (req) => {
      const { vehicleId } = req.params
      const body = inspectionSchema.parse(req.body)
      return vehiclesService.addInspection(req.user.sub, vehicleId, {
        status: body.status,
        result: body.result,
        inspectedAt: body.inspectedAt ? new Date(body.inspectedAt) : undefined,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
      })
    },
  )

  // Insurance
  app.get('/:vehicleId/insurance', { preHandler: [authenticate, authorize('driver')] }, async (req) => {
    const { vehicleId } = req.params as { vehicleId: string }
    return vehiclesService.listInsurance(req.user.sub, vehicleId)
  })

  app.post<{ Body: InsuranceBody; Params: { vehicleId: string } }>(
    '/:vehicleId/insurance',
    { preHandler: [authenticate, authorize('driver')] },
    async (req) => {
      const { vehicleId } = req.params
      const body = insuranceSchema.parse(req.body)
      return vehiclesService.addInsurance(req.user.sub, vehicleId, {
        provider: body.provider,
        policyNumber: body.policyNumber,
        expiresAt: new Date(body.expiresAt),
        documentUrl: body.documentUrl,
      })
    },
  )
}