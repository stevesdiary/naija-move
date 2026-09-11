import { supportRepository } from './support.repository.js'
import { errors } from '../../lib/errors.js'

export const supportService = {
  async createCase(params: {
    userId: string
    userType: string
    referenceId?: string
    referenceType?: string
    category: string
    subject: string
    priority?: string
    initialMessage: string
  }) {
    const case_ = await supportRepository.createCase({
      userId: params.userId,
      userType: params.userType,
      referenceId: params.referenceId,
      referenceType: params.referenceType,
      category: params.category,
      subject: params.subject,
      priority: params.priority,
    })

    await supportRepository.addMessage(case_.id, {
      authorId: params.userId,
      authorType: 'user',
      body: params.initialMessage,
    })

    return case_
  },

  async getCase(caseId: string, userId?: string, userType?: string) {
    const case_ = await supportRepository.findCaseById(caseId)
    if (!case_) throw errors.notFound('Case not found')

    // Users can only see their own cases unless they're agents/admins
    if (userId && case_.userId !== userId && userType !== 'agent' && userType !== 'admin') {
      throw errors.forbidden('Not authorized to view this case')
    }

    return case_
  },

  async updateCaseStatus(caseId: string, status: string, actorId: string, actorType: string) {
    const case_ = await supportRepository.updateCaseStatus(caseId, status, actorId, actorType)
    if (!case_) throw errors.notFound('Case not found')
    return case_
  },

  async assignCase(caseId: string, assignedTo: string, actorId: string) {
    const case_ = await supportRepository.assignCase(caseId, assignedTo, actorId)
    if (!case_) throw errors.notFound('Case not found')
    return case_
  },

  async addMessage(caseId: string, params: {
    authorId: string
    authorType: 'user' | 'agent' | 'system'
    body: string
    isInternal?: boolean
  }) {
    const case_ = await supportRepository.findCaseById(caseId)
    if (!case_) throw errors.notFound('Case not found')

    // Update status if user replies to pending_agent
    if (params.authorType === 'user' && case_.status === 'pending_agent') {
      await supportRepository.updateCaseStatus(caseId, 'pending_user', params.authorId, 'user')
    }

    // Update status if agent replies to pending_user
    if (params.authorType === 'agent' && case_.status === 'pending_user') {
      await supportRepository.updateCaseStatus(caseId, 'pending_agent', params.authorId, 'agent')
    }

    return supportRepository.addMessage(caseId, params)
  },

  async getMessages(caseId: string, userId?: string, userType?: string, includeInternal = false) {
    const case_ = await supportRepository.findCaseById(caseId)
    if (!case_) throw errors.notFound('Case not found')

    if (userId && case_.userId !== userId && userType !== 'agent' && userType !== 'admin') {
      throw errors.forbidden('Not authorized to view this case')
    }

    return supportRepository.getMessages(caseId, includeInternal)
  },

  async listCases(filters?: {
    userId?: string
    status?: string
    category?: string
    priority?: string
    assignedTo?: string
    limit?: number
    offset?: number
  }) {
    return supportRepository.listCases(filters)
  },

  async getCaseEvents(caseId: string) {
    return supportRepository.getEvents(caseId)
  },
}