import { timingSafeEqual } from 'node:crypto'

/** Constant-time string equality for shared secrets / signatures. */
export function secretEquals(given: unknown, expected: string): boolean {
  if (typeof given !== 'string') return false
  const a = Buffer.from(given, 'utf8')
  const b = Buffer.from(expected, 'utf8')
  return a.length === b.length && timingSafeEqual(a, b)
}
