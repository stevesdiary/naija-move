import { env } from '../config/env.js'

export interface SmsProvider {
  sendOtp(phone: string, code: string): Promise<void>
  sendMessage(phone: string, message: string): Promise<void>
}

// Mock implementation — logs to console in dev, swap for Termii in production
const mockSms: SmsProvider = {
  async sendOtp(phone, code) {
    if (env.NODE_ENV !== 'test') {
      console.log(`[SMS OTP] → ${phone}: Your NaijaMove code is ${code}`)
    }
  },
  async sendMessage(phone, message) {
    if (env.NODE_ENV !== 'test') {
      console.log(`[SMS] → ${phone}: ${message}`)
    }
  },
}

export const sms: SmsProvider = mockSms
