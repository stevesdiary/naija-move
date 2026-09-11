import type { FastifyInstance } from 'fastify'
import { env } from '../../config/env.js'
import { errors } from '../../lib/errors.js'
import { settlementQueue, complianceQueue, fraudQueue } from '../../queues/queues.js'

const JOB_TYPES = ['settlement', 'compliance', 'fraud'] as const
type JobType = (typeof JOB_TYPES)[number]

export async function internalRoutes(app: FastifyInstance) {
  app.post<{ Params: { type: string } }>('/jobs/enqueue/:type', async (req, reply) => {
    const secret = req.headers['x-internal-secret']
    if (secret !== env.INTERNAL_JOB_SECRET) throw errors.unauthorized()

    const type = req.params.type as JobType
    if (!JOB_TYPES.includes(type)) throw errors.notFound(`Unknown job type: ${type}`)

    const queues = { settlement: settlementQueue, compliance: complianceQueue, fraud: fraudQueue }
    await queues[type].add('run', {}, { jobId: `${type}:${Date.now()}` })

    return reply.status(202).send({ queued: type })
  })
}
