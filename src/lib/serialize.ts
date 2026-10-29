/**
 * Deep camelCase → snake_case key conversion for JSON responses.
 *
 * The mobile apps consume the API's natural camelCase (Drizzle) shapes, but the
 * admin dashboard was built against snake_case. Rather than hand-write a
 * snake_case DTO for every admin endpoint, the admin plugin runs this over its
 * responses in a `preSerialization` hook, so server code can stay idiomatic
 * camelCase and the dashboard still gets snake_case.
 *
 * Only plain objects and arrays are transformed; Date and other class instances
 * pass through untouched (Dates serialize to ISO strings as usual). Values are
 * never touched — only keys — so enum strings, ids, etc. are preserved.
 */
const toSnake = (key: string): string =>
  key.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase())

export function snakeKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(snakeKeysDeep)
  if (value !== null && typeof value === 'object') {
    if (value instanceof Date) return value
    const proto = Object.getPrototypeOf(value)
    // Leave class instances (Buffers, etc.) alone; only convert plain objects.
    if (proto !== Object.prototype && proto !== null) return value
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[toSnake(k)] = snakeKeysDeep(v)
    }
    return out
  }
  return value
}
