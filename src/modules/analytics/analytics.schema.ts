import { z } from 'zod'

export const analyticsFiltersSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  interval: z.enum(['hour', 'day', 'week', 'month']).optional(),
})

export type AnalyticsFilters = z.infer<typeof analyticsFiltersSchema>