/** Clamp user-supplied paging so `?limit=99999999` can't turn a list endpoint into a table dump. */
export const MAX_PAGE_SIZE = 100

export function clampLimit(raw: string | undefined, fallback: number): number {
  const n = raw === undefined ? fallback : Number.parseInt(raw, 10)
  if (!Number.isFinite(n) || n < 1) return fallback
  return Math.min(n, MAX_PAGE_SIZE)
}

export function clampOffset(raw: string | undefined): number {
  const n = raw === undefined ? 0 : Number.parseInt(raw, 10)
  if (!Number.isFinite(n) || n < 0) return 0
  return n
}
