import type { FastifyInstance } from 'fastify'
import { authenticate, authorize } from '../../lib/rbac.js'
import {
  createCaseSchema,
  addMessageSchema,
  updateCaseStatusSchema,
  assignCaseSchema,
  type CreateCaseBody,
  type AddMessageBody,
  type UpdateCaseStatusBody,
  type AssignCaseBody,
} from './support.schema.js'
import { supportService } from './support.service.js'

export async function supportRoutes(app: FastifyInstance) {
  // User: create support case
  app.post<{ Body: CreateCaseBody }>('/', { preHandler: [authenticate] }, async (req) => {
    const body = createCaseSchema.parse(req.body)
    return supportService.createCase({
      userId: req.user.sub,
      userType: req.user.role,
      referenceId: body.referenceId,
      referenceType: body.referenceType,
      category: body.category,
      subject: body.subject,
      priority: body.priority,
      initialMessage: body.initialMessage,
    })
  })

  // User: list my cases
  app.get('/', { preHandler: [authenticate] }, async (req) => {
    const { status, category, priority, limit, offset } = req.query as {
      status?: string; category?: string; priority?: string; limit?: string; offset?: string
    }
    return supportService.listCases({
      userId: req.user.sub,
      status,
      category,
      priority,
      limit: limit ? parseInt(limit) : 20,
      offset: offset ? parseInt(offset) : 0,
    })
  })

  // User: get case details
  app.get('/:caseId', { preHandler: [authenticate] }, async (req) => {
    const { caseId } = req.params as { caseId: string }
    return supportService.getCase(caseId, req.user.sub, req.user.role)
  })

  // User: add message to case
  app.post<{ Body: AddMessageBody; Params: { caseId: string } }>(
    '/:caseId/messages',
    { preHandler: [authenticate] },
    async (req) => {
      const { caseId } = req.params
      const body = addMessageSchema.parse(req.body)
      return supportService.addMessage(caseId, {
        authorId: req.user.sub,
        authorType: 'user',
        body: body.body,
        isInternal: body.isInternal,
      })
    },
  )

  // User: get case messages
  app.get('/:caseId/messages', { preHandler: [authenticate] }, async (req) => {
    const { caseId } = req.params as { caseId: string }
    return supportService.getMessages(caseId, req.user.sub, req.user.role)
  })

  // Agent/Admin: list all cases
  app.get('/admin/all', { preHandler: [authenticate, authorize('admin')] }, async (req) => {
    const { userId, status, category, priority, assignedTo, limit, offset } = req.query as {
      userId?: string; status?: string; category?: string; priority?: string; assignedTo?: string; limit?: string; offset?: string
    }
    return supportService.listCases({
      userId,
      status,
      category,
      priority,
      assignedTo,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0,
    })
  })

  // Agent/Admin: update case status
  app.put<{ Body: UpdateCaseStatusBody; Params: { caseId: string } }>(
    '/:caseId/status',
    { preHandler: [authenticate, authorize('admin')] },
    async (req) => {
      const { caseId } = req.params
      const body = updateCaseStatusSchema.parse(req.body)
      return supportService.updateCaseStatus(caseId, body.status, req.user.sub, req.user.role)
    },
  )

  // Agent/Admin: assign case
  app.post<{ Body: AssignCaseBody; Params: { caseId: string } }>(
    '/:caseId/assign',
    { preHandler: [authenticate, authorize('admin')] },
    async (req) => {
      const { caseId } = req.params
      const body = assignCaseSchema.parse(req.body)
      return supportService.assignCase(caseId, body.assignedTo, req.user.sub)
    },
  )

  // Agent: add internal message
  app.post<{ Body: AddMessageBody; Params: { caseId: string } }>(
    '/:caseId/messages',
    { preHandler: [authenticate, authorize('admin')] },
    async (req) => {
      const { caseId } = req.params
      const body = addMessageSchema.parse(req.body)
      return supportService.addMessage(caseId, {
        authorId: req.user.sub,
        authorType: 'agent',
        body: body.body,
        isInternal: body.isInternal,
      })
    },
  )

  // Agent: get case messages (including internal)
  app.get('/:caseId/messages', { preHandler: [authenticate, authorize('admin')] }, async (req) => {
    const { caseId } = req.params as { caseId: string }
    return supportService.getMessages(caseId, undefined, 'agent', true)
  })

  // Get case events/history
  app.get('/:caseId/events', { preHandler: [authenticate] }, async (req) => {
    const { caseId } = req.params as { caseId: string }
    return supportService.getCaseEvents(caseId)
  })
}