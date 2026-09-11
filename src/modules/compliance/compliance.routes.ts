import type { FastifyInstance } from 'fastify'
import { authenticate, authorize } from '../../lib/rbac.js'
import {
  createComplianceItemSchema,
  updateComplianceItemSchema,
  type CreateComplianceItemBody,
  type UpdateComplianceItemBody,
} from './compliance.schema.js'
import { complianceService } from './compliance.service.js'

export async function complianceRoutes(app: FastifyInstance) {
  // User: get my compliance status
  app.get('/items', { preHandler: [authenticate] }, async (req) => {
    const entityType = req.user.role === 'driver' ? 'driver' : 'vehicle' // Simplified - in reality check user type
    return complianceService.getMyCompliance(req.user.sub, entityType)
  })

  // User: check compliance status
  app.get('/status', { preHandler: [authenticate] }, async (req) => {
    const entityType = req.user.role === 'driver' ? 'driver' : 'vehicle'
    return complianceService.checkCompliance(req.user.sub, entityType)
  })

  // Driver: get specific driver compliance (for admin or self)
  app.get('/driver/:driverId', { preHandler: [authenticate] }, async (req) => {
    const { driverId } = req.params as { driverId: string }
    // Allow self or admin
    if (req.user.sub !== driverId && req.user.role !== 'admin') {
      return { items: [], status: 'pending', message: 'Unauthorized' }
    }
    const items = await complianceService.getMyCompliance(driverId, 'driver')
    return { items, status: items.some(i => i.blocksActivation && (i.status === 'pending' || i.status === 'expired' || i.status === 'blocked')) ? 'blocked' : 'compliant' }
  })

  // Admin: create compliance item
  app.post<{ Body: CreateComplianceItemBody }>('/items', { preHandler: [authenticate, authorize('admin')] }, async (req) => {
    const body = createComplianceItemSchema.parse(req.body)
    return complianceService.createComplianceItem({ ...body, expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined })
  })

  // Admin: list compliance items
  app.get('/admin/items', { preHandler: [authenticate, authorize('admin')] }, async (req) => {
    const { entityId, entityType, jurisdiction, status, limit, offset } = req.query as {
      entityId?: string
      entityType?: string
      jurisdiction?: string
      status?: string
      limit?: string
      offset?: string
    }
    return complianceService.listComplianceItems({
      entityId,
      entityType: entityType as 'driver' | 'vehicle' | undefined,
      jurisdiction,
      status,
      limit: limit ? parseInt(limit) : 20,
      offset: offset ? parseInt(offset) : 0,
    })
  })

  // Admin: update compliance item
  app.put<{ Body: UpdateComplianceItemBody; Params: { itemId: string } }>(
    '/admin/items/:itemId',
    { preHandler: [authenticate, authorize('admin')] },
    async (req) => {
      const { itemId } = req.params
      const body = updateComplianceItemSchema.parse(req.body)
      return complianceService.updateComplianceItem(itemId, { ...body, triggeredBy: 'admin', actorId: req.user.sub })
    },
  )

  // Admin: delete compliance item
  app.delete('/admin/items/:itemId', { preHandler: [authenticate, authorize('admin')] }, async (req) => {
    const { itemId } = req.params as { itemId: string }
    return complianceService.deleteComplianceItem(itemId)
  })

  // Admin: compliance stats
  app.get('/admin/stats', { preHandler: [authenticate, authorize('admin')] }, async () => {
    return complianceService.getStats()
  })
}