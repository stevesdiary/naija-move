import { ridersService } from '../modules/riders/riders.service.js'
import { driversService } from '../modules/drivers/drivers.service.js'
import { errors } from './errors.js'

/**
 * JWT `sub` is the users.id. Trips, offers and delivery jobs reference the
 * rider/driver *profile* rows, so every route acting on those must resolve the
 * profile id first — never compare a profile id against `req.user.sub`.
 */
export async function riderIdFor(userId: string): Promise<string> {
  const rider = await ridersService.getProfile(userId)
  if (!rider) throw errors.forbidden('Rider profile missing')
  return rider.id
}

export async function driverIdFor(userId: string): Promise<string> {
  const driver = await driversService.getProfile(userId) // throws 404 if missing
  return driver.id
}
