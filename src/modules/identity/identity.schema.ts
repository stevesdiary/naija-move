import { z } from 'zod'

export const otpRequestSchema = z.object({
  phone: z.string().regex(/^\+234[0-9]{10}$/, 'Must be a valid Nigerian phone number (+234XXXXXXXXXX)'),
})

export const otpVerifySchema = z.object({
  phone: z.string(),
  code: z.string().length(6),
})

export const tokenRefreshSchema = z.object({
  refreshToken: z.string().min(1),
})

export type OtpRequestBody = z.infer<typeof otpRequestSchema>
export type OtpVerifyBody = z.infer<typeof otpVerifySchema>
export type TokenRefreshBody = z.infer<typeof tokenRefreshSchema>
