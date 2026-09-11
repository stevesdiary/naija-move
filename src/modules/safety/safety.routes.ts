import type { FastifyInstance } from 'fastify'
import { authenticate, authorize } from '../../lib/rbac.js'
import {
  sosTriggerSchema,
  reportIncidentSchema,
  updateIncidentStatusSchema,
  assignIncidentSchema,
  type SOSBody,
  type ReportIncidentBody,
  type UpdateIncidentStatusBody,
  type AssignIncidentBody,
} from './safety.schema.js'
import { safetyService } from './safety.service.js'

export async function safetyRoutes(app: FastifyInstance) {
  // SOS endpoint - high priority
  app.post<{ Body: SOSBody }>('/sos', { preHandler: [authenticate] }, async (req) => {
    const body = sosTriggerSchema.parse(req.body)
    return safetyService.triggerSOS({
      userId: req.user.sub,
      userType: req.user.role,
      tripId: body.tripId,
      lat: body.lat,
      lng: body.lng,
      description: body.description,
    })
  })

  // Report general incident
  app.post<{ Body: ReportIncidentBody }>('/incidents', { preHandler: [authenticate] }, async (req) => {
    const body = reportIncidentSchema.parse(req.body)
    return safetyService.reportIncident({
      userId: req.user.sub,
      userType: req.user.role,
      tripId: body.tripId,
      type: body.type,
      severity: body.severity,
      description: body.description,
    })
  })

  // Get incident
  app.get('/incidents/:incidentId', { preHandler: [authenticate] }, async (req) => {
    const { incidentId } = req.params as { incidentId: string }
    return safetyService.getIncident(incidentId)
  })

  // Update incident status (agent/admin)
  app.put<{ Body: UpdateIncidentStatusBody; Params: { incidentId: string } }>(
    '/incidents/:incidentId/status',
    { preHandler: [authenticate, authorize('admin')] },
    async (req) => {
      const { incidentId } = req.params
      const body = updateIncidentStatusSchema.parse(req.body)
      return safetyService.updateIncidentStatus(incidentId, body.status, req.user.sub, req.user.role, body.note)
    },
  )

  // Assign incident (admin)
  app.post<{ Body: AssignIncidentBody; Params: { incidentId: string } }>(
    '/incidents/:incidentId/assign',
    { preHandler: [authenticate, authorize('admin')] },
    async (req) => {
      const { incidentId } = req.params
      const body = assignIncidentSchema.parse(req.body)
      return safetyService.assignIncident(incidentId, body.assignedTo, req.user.sub)
    },
  )

  // List incidents (admin)
  app.get('/incidents', { preHandler: [authenticate, authorize('admin')] }, async (req) => {
    const { status, severity, userId, tripId, limit, offset } = req.query as {
      status?: string; severity?: string; userId?: string; tripId?: string; limit?: string; offset?: string
    }
    return safetyService.listIncidents({
      status, severity, userId, tripId,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0,
    })
  })

  // Incident events/history
  app.get('/incidents/:incidentId/events', { preHandler: [authenticate] }, async (req) => {
    const { incidentId } = req.params as { incidentId: string }
    return safetyService.getIncidentEvents(incidentId)
  })
}