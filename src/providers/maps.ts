import { env } from '../config/env.js'

export type Coordinates = { lat: number; lng: number }

export type RouteResult = {
  distanceMeters: number
  durationSeconds: number
  polyline: string
}

export type GeocodedPlace = {
  name: string
  address: string
  coordinates: Coordinates
}

export type MapProvider = 'osrm' | 'mapbox' | 'graphhopper'

export interface TileProvider {
  name: string
  url: string
  attribution: string
  requiresToken?: boolean
}

export const TILE_PROVIDERS: Record<string, TileProvider> = {
  maptiler: {
    name: 'MapTiler',
    url: 'https://api.maptiler.com/maps/streets/{z}/{x}/{y}.png?key={token}',
    attribution: '© MapTiler © OpenStreetMap contributors',
    requiresToken: true,
  },
  stadia: {
    name: 'Stadia Maps',
    url: 'https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png?api_key={token}',
    attribution: '© Stadia Maps © OpenStreetMap contributors',
    requiresToken: true,
  },
  osm: {
    name: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors',
    requiresToken: false,
  },
  cartodb: {
    name: 'CartoDB',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '© OpenStreetMap contributors © CARTO',
    requiresToken: false,
  },
}

// OSM-first: OSRM (free, no key) is primary for routing
// Mapbox is only fallback if explicitly configured

async function getRouteOSRM(origin: Coordinates, destination: Coordinates): Promise<RouteResult> {
  const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?geometries=polyline&overview=full`

  const res = await fetch(url, { headers: { 'User-Agent': 'NaijaMove/1.0' } })
  if (!res.ok) throw new Error(`OSRM error: ${res.status}`)

  const data = await res.json() as { routes: Array<{ distance: number; duration: number; geometry: string }>; code: string }
  if (data.code !== 'Ok' || !data.routes?.[0]) throw new Error('No route found')

  const route = data.routes[0]
  return {
    // distance/duration are persisted to bigint columns — keep them whole.
    distanceMeters: Math.round(route.distance),
    durationSeconds: Math.round(route.duration),
    polyline: route.geometry,
  }
}

async function getRouteMapbox(origin: Coordinates, destination: Coordinates): Promise<RouteResult> {
  const token = env.MAPBOX_ACCESS_TOKEN
  if (!token) throw new Error('Mapbox token not configured')

  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?access_token=${token}&geometries=polyline&overview=full`

  const res = await fetch(url)
  if (!res.ok) throw new Error(`Mapbox directions error: ${res.status}`)

  const data = await res.json() as { routes: Array<{ distance: number; duration: number; geometry: string }> }
  const route = data.routes[0]
  if (!route) throw new Error('No route found')

  return {
    // distance/duration are persisted to bigint columns — keep them whole.
    distanceMeters: Math.round(route.distance),
    durationSeconds: Math.round(route.duration),
    polyline: route.geometry,
  }
}

export async function getRoute(origin: Coordinates, destination: Coordinates): Promise<RouteResult> {
  // OSM-first: OSRM is primary (free, no key, OSM-based)
  // Mapbox is only fallback if explicitly configured
  try {
    return await getRouteOSRM(origin, destination)
  } catch (osrmError) {
    // Fallback to Mapbox only if configured
    if (env.MAPBOX_ACCESS_TOKEN) {
      try {
        return await getRouteMapbox(origin, destination)
      } catch {}
    }
    throw new Error('Routing failed: OSRM unavailable and no Mapbox fallback configured')
  }
}

async function geocodeNominatim(query: string): Promise<GeocodedPlace[]> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&countrycodes=ng&limit=5&addressdetails=1`

  const res = await fetch(url, { headers: { 'User-Agent': 'NaijaMove/1.0 (contact@naijamove.com)' } })
  if (!res.ok) return []

  const data = await res.json() as Array<{
    display_name: string
    name: string
    lat: string
    lon: string
    type: string
    class: string
  }>

  return data.map((d) => ({
    name: d.name || d.display_name,
    address: d.display_name,
    coordinates: { lat: parseFloat(d.lat), lng: parseFloat(d.lon) },
  }))
}

async function geocodePhoton(query: string): Promise<GeocodedPlace[]> {
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5&lang=en&bbox=2.5,4.0,8.5,11.0` // Nigeria bbox

  const res = await fetch(url)
  if (!res.ok) return []

  const data = await res.json() as { features: Array<{ properties: { name: string; city: string; country: string; osm_id: number; extent: number[]; lat: number; lon: number } }> }

  return data.features.map((f) => ({
    name: f.properties.name,
    address: `${f.properties.name}, ${f.properties.city}, ${f.properties.country}`,
    coordinates: { lat: f.properties.lat, lng: f.properties.lon },
  }))
}

async function geocodeMapbox(query: string): Promise<GeocodedPlace[]> {
  const token = env.MAPBOX_ACCESS_TOKEN
  if (!token) throw new Error('Mapbox token not configured')

  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&country=NG&limit=5`

  const res = await fetch(url)
  if (!res.ok) throw new Error(`Mapbox geocoding error: ${res.status}`)

  const data = await res.json() as { features: Array<{ place_name: string; text: string; center: [number, number] }> }

  return data.features.map((f) => ({
    name: f.text,
    address: f.place_name,
    coordinates: { lng: f.center[0], lat: f.center[1] },
  }))
}

export async function geocode(query: string): Promise<GeocodedPlace[]> {
  // OSM-first geocoding: Photon → Nominatim (both OSM-based, no keys)
  // Mapbox only as fallback if explicitly configured
  try {
    const results = await geocodePhoton(query)
    if (results.length > 0) return results
  } catch {}

  try {
    const results = await geocodeNominatim(query)
    if (results.length > 0) return results
  } catch {}

  if (env.MAPBOX_ACCESS_TOKEN) {
    try {
      return await geocodeMapbox(query)
    } catch {}
  }

  return []
}

// Reverse geocoding
export async function reverseGeocode(coords: Coordinates): Promise<GeocodedPlace | null> {
  const query = `${coords.lat},${coords.lng}`
  const results = await geocode(query)
  return results[0] || null
}

// Get tile URL for a provider
export function getTileUrl(provider: string, token?: string): string | null {
  const tileProvider = TILE_PROVIDERS[provider]
  if (!tileProvider) return null

  let url = tileProvider.url
  if (tileProvider.requiresToken && token) {
    url = url.replace('{token}', token)
  }
  return url
}

export function getDefaultTileProvider(): TileProvider {
  if (env.MAPTILER_TOKEN) return { ...TILE_PROVIDERS.maptiler, url: TILE_PROVIDERS.maptiler.url.replace('{token}', env.MAPTILER_TOKEN) }
  if (env.STADIA_MAPS_TOKEN) return { ...TILE_PROVIDERS.stadia, url: TILE_PROVIDERS.stadia.url.replace('{token}', env.STADIA_MAPS_TOKEN) }
  return TILE_PROVIDERS.cartodb // No token required, good quality
}

export const maps = { getRoute, geocode, reverseGeocode, getTileUrl, getDefaultTileProvider, TILE_PROVIDERS }