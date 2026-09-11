import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify'

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export const errors = {
  unauthorized: (msg = 'Unauthorized') => new AppError(401, 'UNAUTHORIZED', msg),
  forbidden: (msg = 'Forbidden') => new AppError(403, 'FORBIDDEN', msg),
  notFound: (msg = 'Not found') => new AppError(404, 'NOT_FOUND', msg),
  conflict: (msg = 'Conflict') => new AppError(409, 'CONFLICT', msg),
  unprocessable: (msg: string) => new AppError(422, 'UNPROCESSABLE', msg),
  badRequest: (msg: string) => new AppError(400, 'BAD_REQUEST', msg),
  internal: (msg = 'Internal server error') => new AppError(500, 'INTERNAL', msg),
}

export function errorHandler(
  error: FastifyError | AppError | Error,
  _req: FastifyRequest,
  reply: FastifyReply,
) {
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      error: { code: error.code, message: error.message },
    })
  }

  // Fastify validation error
  if ('statusCode' in error && error.statusCode === 400) {
    return reply.status(400).send({
      error: { code: 'VALIDATION_ERROR', message: error.message },
    })
  }

  reply.log.error(error)
  return reply.status(500).send({
    error: { code: 'INTERNAL', message: 'Internal server error' },
  })
}
