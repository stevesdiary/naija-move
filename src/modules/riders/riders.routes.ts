import type { FastifyInstance } from 'fastify'
import { authenticate, authorize } from '../../lib/rbac.js'
import {
  updateProfileSchema,
  savedPlaceSchema,
  emergencyContactSchema,
  type UpdateProfileBody,
  type SavedPlaceBody,
  type EmergencyContactBody,
} from './riders.schema.js'
import { ridersService } from './riders.service.js'

export async function riderRoutes(app: FastifyInstance) {
  app.get('/me', { preHandler: [authenticate, authorize('rider')] }, async (req) => {
    return ridersService.getProfile(req.user.sub)
  })

  app.put<{ Body: UpdateProfileBody }>('/me', { preHandler: [authenticate, authorize('rider')] }, async (req) => {
    const body = updateProfileSchema.parse(req.body)
    return ridersService.updateProfile(req.user.sub, body)
  })

  app.get('/me/trips', { preHandler: [authenticate, authorize('rider')] }, async (req) => {
    // TODO: Phase 6 - implement trip history
    return { trips: [], message: 'Trip history - Phase 6' }
  })

  // Saved Places
  app.get('/me/saved-places', { preHandler: [authenticate, authorize('rider')] }, async (req) => {
    return ridersService.listSavedPlaces(req.user.sub)
  })

  app.post<{ Body: SavedPlaceBody }>('/me/saved-places', { preHandler: [authenticate, authorize('rider')] }, async (req) => {
    const body = savedPlaceSchema.parse(req.body)
    return ridersService.addSavedPlace(req.user.sub, body)
  })

  app.delete('/me/saved-places/:placeId', { preHandler: [authenticate, authorize('rider')] }, async (req) => {
    const { placeId } = req.params as { placeId: string }
    await ridersService.removeSavedPlace(req.user.sub, placeId)
    return { message: 'Saved place removed' }
  })

  // Emergency Contacts
  app.get('/me/emergency-contacts', { preHandler: [authenticate, authorize('rider')] }, async (req) => {
    return ridersService.listEmergencyContacts(req.user.sub)
  })

  app.post<{ Body: EmergencyContactBody }>('/me/emergency-contacts', { preHandler: [authenticate, authorize('rider')] }, async (req) => {
    const body = emergencyContactSchema.parse(req.body)
    return ridersService.addEmergencyContact(req.user.sub, body)
  })

  app.delete('/me/emergency-contacts/:contactId', { preHandler: [authenticate, authorize('rider')] }, async (req) => {
    const { contactId } = req.params as { contactId: string }
    await ridersService.removeEmergencyContact(req.user.sub, contactId)
    return { message: 'Emergency contact removed' }
  })
}