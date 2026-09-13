import type { FastifyInstance } from 'fastify'
import { authenticate } from '../../lib/rbac.js'
import { AppError } from '../../lib/errors.js'
import { presignSchema, type PresignBody } from './uploads.schema.js'
import { uploadsService } from './uploads.service.js'

export async function uploadRoutes(app: FastifyInstance) {
  /**
   * Step 1 of an upload: get a one-shot URL. The client then PUTs the file
   * bytes to `uploadUrl` with exactly `headers`, and finally submits `key` to
   * whichever endpoint owns the record (e.g. POST /drivers/documents).
   */
  app.post<{ Body: PresignBody }>(
    '/presign',
    { preHandler: [authenticate], config: { rateLimit: { max: 30, timeWindow: '1 minute' } } },
    async (req) => {
      if (!uploadsService.enabled) throw new AppError(501, 'STORAGE_DISABLED', 'File storage is not configured')
      const body = presignSchema.parse(req.body)
      return uploadsService.presign(req.user.sub, body.purpose, body.contentType, body.sizeBytes)
    },
  )
}
