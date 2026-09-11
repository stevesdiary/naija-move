import { safetyRepository } from './safety.repository.js'
import { notificationQueue } from '../../queues/queues.js'
import { errors } from '../../lib/errors.js'

export const safetyService = {
  async triggerSOS(params: {
    userId: string
    userType: string
    tripId?: string
    lat?: number
    lng?: number
    description?: string
  }) {
    const incident = await safetyRepository.createIncident({
      tripId: params.tripId,
      reportedBy: params.userId,
      reporterType: params.userType,
      severity: 'critical',
      type: 'sos',
      description: params.description ?? 'SOS triggered by user',
    })

    // Enqueue high-priority notification to safety team
    await notificationQueue.add('sos_alert', {
      incidentId: incident.id,
      userId: params.userId,
      userType: params.userType,
      tripId: params.tripId,
      lat: params.lat,
      lng: params.lng,
      description: params.description,
    }, { priority: 1 }) // Highest priority

    return incident
  },

  async reportIncident(params: {
    userId: string
    userType: string
    tripId?: string
    type: string
    severity?: 'low' | 'medium' | 'high' | 'critical'
    description?: string
  }) {
    return safetyRepository.createIncident({
      tripId: params.tripId,
      reportedBy: params.userId,
      reporterType: params.userType,
      severity: params.severity ?? 'medium',
      type: params.type,
      description: params.description,
    })
  },

  async getIncident(incidentId: string) {
    const incident = await safetyRepository.findIncidentById(incidentId)
    if (!incident) throw errors.notFound('Incident not found')
    return incident
  },

  async updateIncidentStatus(incidentId: string, status: string, actorId: string, actorType: string, note?: string) {
    const incident = await safetyRepository.updateStatus(incidentId, status, actorId, actorType, note)
    if (!incident) throw errors.notFound('Incident not found')
    
    // Notify relevant parties on status change
    if (['resolved', 'closed'].includes(status) && incident.reportedBy) {
      await notificationQueue.add('incident_resolved', {
        incidentId,
        status,
        userId: incident.reportedBy,
      })
    }
    
    return incident
  },

  async assignIncident(incidentId: string, assignedTo: string, actorId: string) {
    const incident = await safetyRepository.assignIncident(incidentId, assignedTo, actorId)
    if (!incident) throw errors.notFound('Incident not found')
    
    // Notify assigned agent
    await notificationQueue.add('incident_assigned', {
      incidentId,
      assignedTo,
    })
    
    return incident
  },

  async listIncidents(filters?: {
    status?: string
    severity?: string
    userId?: string
    tripId?: string
    limit?: number
    offset?: number
  }) {
    return safetyRepository.listIncidents({
      status: filters?.status,
      severity: filters?.severity,
      reportedBy: filters?.userId,
      tripId: filters?.tripId,
      limit: filters?.limit,
      offset: filters?.offset,
    })
  },

  async getIncidentEvents(incidentId: string) {
    return safetyRepository.getEvents(incidentId)
  },
}