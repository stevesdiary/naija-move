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

async function getRoute(origin: Coordinates, destination: Coordinates): Promise<RouteResult> {
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?access_token=${env.MAPBOX_ACCESS_TOKEN}&geometries=polyline&overview=full`

  const res = await fetch(url)
  if (!res.ok) throw new Error(`Mapbox directions error: ${res.status}`)

  const data = (await res.json()) as {
    routes: Array<{ distance: number; duration: number; geometry: string }>
  }

  const route = data.routes[0]
  if (!route) throw new Error('No route found')

  return {
    distanceMeters: route.distance,
    durationSeconds: route.duration,
    polyline: route.geometry,
  }
}

async function geocode(query: string): Promise<GeocodedPlace[]> {
  // Try Mapbox first
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${env.MAPBOX_ACCESS_TOKEN}&country=NG&limit=5`

  const res = await fetch(url)
  if (!res.ok) return geocodeFallback(query)

  const data = (await res.json()) as {
    features: Array<{
      place_name: string
      text: string
      center: [number, number]
    }>
  }

  return data.features.map((f) => ({
    name: f.text,
    address: f.place_name,
    coordinates: { lng: f.center[0], lat: f.center[1] },
  }))
}

// OSM Nominatim fallback
async function geocodeFallback(query: string): Promise<GeocodedPlace[]> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&countrycodes=ng&limit=5`

  const res = await fetch(url, { headers: { 'User-Agent': 'NaijaMove/1.0' } })
  if (!res.ok) return []

  const data = (await res.json()) as Array<{
    display_name: string
    name: string
    lat: string
    lon: string
  }>

  return data.map((d) => ({
    name: d.name || d.display_name,
    address: d.display_name,
    coordinates: { lat: parseFloat(d.lat), lng: parseFloat(d.lon) },
  }))
}

export const maps = { getRoute, geocode }
