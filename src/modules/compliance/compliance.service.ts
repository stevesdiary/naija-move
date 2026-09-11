import { complianceRepository } from './compliance.repository.js'
import { errors } from '../../lib/errors.js'

export const complianceService = {
  // Driver/Vehicle: get my compliance items
  async getMyCompliance(entityId: string, entityType: 'driver' | 'vehicle') {
    return complianceRepository.listItems({ entityId, entityType })
  },

  // Driver/Vehicle: check if compliant (all items compliant and not expiring soon)
  async checkCompliance(entityId: string, entityType: 'driver' | 'vehicle') {
    const items = await complianceRepository.listItems({ entityId, entityType })
    const hasBlocking = items.some(item => item.blocksActivation && (item.status === 'pending' || item.status === 'expired' || item.status === 'blocked'))
    const hasExpiring = items.some(item => item.status === 'expiring_soon')
    return { compliant: !hasBlocking, blocking: hasBlocking, expiring: hasExpiring, items }
  },

  // Admin: create compliance item requirement
  async createComplianceItem(data: {
    entityId: string
    entityType: 'driver' | 'vehicle'
    jurisdiction: string
    itemType: string
    blocksActivation?: boolean
    expiresAt?: Date
  }) {
    return complianceRepository.createItem({ ...data, status: 'pending' })
  },

  // Admin: list all compliance items
  async listComplianceItems(filters: { entityId?: string; entityType?: string; jurisdiction?: string; status?: string; limit?: number; offset?: number } = {}) {
    return complianceRepository.listItems(filters)
  },

  // Admin: update compliance item status
  async updateComplianceItem(itemId: string, data: { status: string; note?: string; triggeredBy?: string; actorId?: string }) {
    const item = await complianceRepository.findItemById(itemId)
    if (!item) throw errors.notFound('Compliance item not found')

    const updated = await complianceRepository.updateItem(itemId, { status: data.status as any })

    // Log event
    await complianceRepository.createEvent({
      complianceItemId: itemId,
      fromStatus: item.status,
      toStatus: data.status as any,
      triggeredBy: data.triggeredBy ?? 'admin',
      actorId: data.actorId,
      note: data.note,
    })

    return updated
  },

  // Admin: delete compliance item
  async deleteComplianceItem(itemId: string) {
    return complianceRepository.deleteItem(itemId)
  },

  // Admin: get compliance stats
  async getStats() {
    return complianceRepository.getComplianceStats()
  },

  // System: check expiring items (run as cron)
  async checkExpiringCompliance() {
    const expiringItems = await complianceRepository.checkExpiringItems()
    for (const item of expiringItems) {
      await complianceRepository.updateItem(item.id, { status: 'expiring_soon' })
      await complianceRepository.createEvent({
        complianceItemId: item.id,
        fromStatus: 'compliant',
        toStatus: 'expiring_soon' as any,
        triggeredBy: 'system',
        note: 'Item expiring within 30 days',
      })
    }
    return expiringItems.length
  },
}