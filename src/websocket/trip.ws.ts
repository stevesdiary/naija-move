import type { FastifyInstance } from 'fastify'
import type { WebSocket } from 'ws'
import { redis } from '../lib/idempotency.js'

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
  app.get('/ws/trip/:tripId/driver', { websocket: true }, (socket: WebSocket, req) => {
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

        if (msg.type === 'location' && msg.lat !== undefined && msg.lng !== undefined) {
          // Cache last known location in Redis (10s TTL)
          await redis.set(
            `loc:${tripId}`,
            JSON.stringify({ lat: msg.lat, lng: msg.lng, ts: Date.now() }),
            { ex: 10 },
          )
          // Fan out to rider immediately
          broadcast(channel.rider, { type: 'location', lat: msg.lat, lng: msg.lng })
        }

        if (msg.type === 'state' && msg.state) {
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
  app.get('/ws/trip/:tripId/rider', { websocket: true }, async (socket: WebSocket, req) => {
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
