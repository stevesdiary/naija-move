import type { FastifyInstance, FastifyRequest } from 'fastify'
import type { WebSocket } from 'ws'
import { redis } from '../lib/idempotency.js'
import { verifyAccessToken } from '../lib/jwt.js'
import { errors } from '../lib/errors.js'
import { riderIdFor, driverIdFor } from '../lib/actors.js'
import { ridesRepository } from '../modules/rides/rides.repository.js'

const TERMINAL_STATES = new Set(['completed', 'cancelled'])

/**
 * Browsers can't set headers on a WebSocket upgrade, so accept the access token
 * either as `Authorization: Bearer` or as `?token=`. Then require that the caller
 * is *that* trip's rider or driver — a trip id alone must never grant a live GPS feed.
 * Runs as a preHandler, so a failure is a normal 401/403 on the upgrade request.
 */
function tripChannelGuard(side: 'rider' | 'driver') {
  return async (req: FastifyRequest) => {
    const header = req.headers.authorization
    const query = req.query as { token?: string }
    const token = header?.startsWith('Bearer ') ? header.slice(7) : query.token
    if (!token) throw errors.unauthorized()
    const user = verifyAccessToken(token)
    if (user.role !== side) throw errors.forbidden()

    const { tripId } = req.params as { tripId: string }
    const trip = await ridesRepository.findById(tripId)
    if (!trip) throw errors.notFound('Trip not found')
    if (TERMINAL_STATES.has(trip.status)) throw errors.unprocessable('Trip is no longer active')

    const profileId = side === 'rider' ? await riderIdFor(user.sub) : await driverIdFor(user.sub)
    const ownerId = side === 'rider' ? trip.riderId : trip.driverId
    if (ownerId !== profileId) throw errors.forbidden('Not your trip')
  }
}

type TripChannel = {
  driver: Set<WebSocket>
  rider: Set<WebSocket>
}

// In-memory channel registry — keyed by tripId
const channels = new Map<string, TripChannel>()

function getOrCreateChannel(tripId: string): TripChannel {
  if (!channels.has(tripId)) {
    channels.set(tripId, { driver: new Set(), rider: new Set() })
  }
  return channels.get(tripId)!
}

function broadcast(sockets: Set<WebSocket>, payload: unknown) {
  const msg = JSON.stringify(payload)
  for (const ws of sockets) {
    if (ws.readyState === 1) ws.send(msg) // 1 = OPEN
  }
}

export async function tripWsRoutes(app: FastifyInstance) {
  // Driver channel — streams GPS coords and trip state
  app.get('/ws/trip/:tripId/driver', { websocket: true, preHandler: tripChannelGuard('driver') }, (socket: WebSocket, req) => {
    const { tripId } = req.params as { tripId: string }
    const channel = getOrCreateChannel(tripId)
    channel.driver.add(socket)

    socket.on('message', async (raw: Buffer) => {
      try {
        const msg = JSON.parse(raw.toString()) as {
          type: 'location' | 'state'
          lat?: number
          lng?: number
          state?: string
        }

        if (
          msg.type === 'location' &&
          typeof msg.lat === 'number' && typeof msg.lng === 'number' &&
          Math.abs(msg.lat) <= 90 && Math.abs(msg.lng) <= 180
        ) {
          // Cache last known location in Redis (10s TTL)
          await redis.set(
            `loc:${tripId}`,
            JSON.stringify({ lat: msg.lat, lng: msg.lng, ts: Date.now() }),
            { ex: 10 },
          )
          // Fan out to rider immediately
          broadcast(channel.rider, { type: 'location', lat: msg.lat, lng: msg.lng })
        }

        if (msg.type === 'state' && typeof msg.state === 'string' && msg.state.length <= 32) {
          broadcast(channel.rider, { type: 'state', state: msg.state })
        }
      } catch {
        // Malformed message — ignore
      }
    })

    socket.on('close', () => {
      channel.driver.delete(socket)
      cleanupIfEmpty(tripId)
    })
  })

  // Rider channel — receives driver location + trip state events
  app.get('/ws/trip/:tripId/rider', { websocket: true, preHandler: tripChannelGuard('rider') }, async (socket: WebSocket, req) => {
    const { tripId } = req.params as { tripId: string }
    const channel = getOrCreateChannel(tripId)
    channel.rider.add(socket)

    // Send last known location immediately on connect
    const cached = await redis.get<string>(`loc:${tripId}`)
    if (cached) {
      const loc = typeof cached === 'string' ? JSON.parse(cached) : cached
      socket.send(JSON.stringify({ type: 'location', ...loc }))
    }

    socket.on('close', () => {
      channel.rider.delete(socket)
      cleanupIfEmpty(tripId)
    })
  })
}

function cleanupIfEmpty(tripId: string) {
  const channel = channels.get(tripId)
  if (!channel) return
  if (channel.driver.size === 0 && channel.rider.size === 0) {
    channels.delete(tripId)
  }
}

// Called by rides service when trip ends
export function closeTripChannel(tripId: string) {
  const channel = channels.get(tripId)
  if (!channel) return
  const goodbye = JSON.stringify({ type: 'state', state: 'closed' })
  for (const ws of [...channel.driver, ...channel.rider]) {
    if (ws.readyState === 1) {
      ws.send(goodbye)
      ws.close()
    }
  }
  channels.delete(tripId)
}
