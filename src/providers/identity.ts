import { env } from '../config/env.js'
import { errors } from '../lib/errors.js'

/**
 * Nigerian identity verification via the Interswitch Marketplace Identity API
 * (NIN lookup + name match). Adapted from the logistics-server CAC/NIN services.
 *
 * When INTERSWITCH_CLIENT_ID/SECRET are unset a mock provider is used so the
 * rider KYC flow is exercisable end-to-end in dev — it "verifies" any valid
 * 11-digit NIN and echoes the supplied name, mirroring the mock SMS provider.
 */
export interface NinVerificationRequest {
  firstName: string
  lastName: string
  nin: string
}

export interface NinVerificationResult {
  verified: boolean
  /** EXACT_MATCH | PARTIAL_MATCH | NO_MATCH | VERIFIED | FAILED */
  matchStatus: string
  nin: string
  firstName: string
  lastName: string
  middleName: string | null
  gender: string | null
  phone: string | null
  photo: string | null
  trackingId?: string
  provider: 'interswitch' | 'mock'
  raw: unknown
}

function normalise(req: NinVerificationRequest): { firstName: string; lastName: string; nin: string } {
  const firstName = req.firstName?.trim()
  const lastName = req.lastName?.trim()
  const nin = req.nin?.trim().replace(/\D/g, '')
  if (!nin) throw errors.unprocessable('NIN is required')
  if (nin.length !== 11) throw errors.unprocessable('NIN must be an 11-digit number')
  if (!firstName || !lastName) throw errors.unprocessable('First name and last name are required for NIN verification')
  return { firstName, lastName, nin }
}

// --- Interswitch client-credentials token (cached, single-flighted) ---
let cachedToken: string | null = null
let tokenExpiresAt = 0
let tokenPromise: Promise<string> | null = null

async function getAccessToken(forceRefresh = false): Promise<string> {
  const now = Date.now()
  if (!forceRefresh && cachedToken && tokenExpiresAt > now) return cachedToken
  if (tokenPromise) return tokenPromise

  tokenPromise = (async () => {
    try {
      const res = await fetch(`${env.INTERSWITCH_IDENTITY_BASE_URL}/v1/authentication/client`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ clientId: env.INTERSWITCH_CLIENT_ID, clientSecret: env.INTERSWITCH_CLIENT_SECRET }),
      })
      const body: any = await res.json().catch(() => ({}))
      if (!res.ok) throw errors.internal(`Interswitch auth failed (${res.status}): ${body?.message ?? 'unknown'}`)
      const token =
        body?.accessToken ?? body?.token ?? body?.access_token ??
        body?.data?.accessToken ?? body?.data?.token ?? body?.data?.access_token
      if (!token) throw errors.internal('Interswitch auth returned no access token')
      const expiresIn = Number(body?.expires_in ?? body?.expiresIn ?? body?.data?.expires_in ?? 1799)
      tokenExpiresAt = Date.now() + Math.max(expiresIn - 60, 60) * 1000
      cachedToken = token
      return token
    } finally {
      tokenPromise = null
    }
  })()
  return tokenPromise
}

async function verifyNinInterswitch(req: { firstName: string; lastName: string; nin: string }): Promise<NinVerificationResult> {
  const url = `${env.INTERSWITCH_IDENTITY_BASE_URL}/v1/verify/identity/nin`
  const post = async (token: string) =>
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(req),
    })

  let res = await post(await getAccessToken())
  if (res.status === 401) res = await post(await getAccessToken(true)) // token may have expired mid-flight

  const body: any = await res.json().catch(() => ({}))
  if (!res.ok) throw errors.internal(`NIN verification failed (${res.status}): ${body?.message ?? 'unknown'}`)

  const data = body?.data ?? {}
  const statusObj = data.status ?? {}
  const summary = data.summary?.nin_check ?? {}
  const details = data.nin ?? {}
  const verified = String(statusObj.status ?? '').toLowerCase() === 'verified'

  return {
    verified,
    matchStatus: summary.status ?? (verified ? 'VERIFIED' : 'FAILED'),
    nin: req.nin,
    firstName: details.firstname ?? req.firstName,
    lastName: details.lastname ?? req.lastName,
    middleName: details.middlename ?? null,
    gender: details.gender ?? null,
    phone: details.phone ?? null,
    photo: details.photo ?? null,
    trackingId: body?.trackingId,
    provider: 'interswitch',
    raw: data,
  }
}

function verifyNinMock(req: { firstName: string; lastName: string; nin: string }): NinVerificationResult {
  if (env.NODE_ENV !== 'test') {
    console.log(`[IDENTITY MOCK] NIN ${req.nin.slice(0, 3)}****${req.nin.slice(-2)} for ${req.firstName} ${req.lastName} → verified`)
  }
  return {
    verified: true,
    matchStatus: 'EXACT_MATCH',
    nin: req.nin,
    firstName: req.firstName,
    lastName: req.lastName,
    middleName: null,
    gender: null,
    phone: null,
    photo: null,
    trackingId: `mock_${req.nin}`,
    provider: 'mock',
    raw: { mock: true },
  }
}

export const identity = {
  isLive: Boolean(env.INTERSWITCH_CLIENT_ID && env.INTERSWITCH_CLIENT_SECRET),

  async verifyNin(request: NinVerificationRequest): Promise<NinVerificationResult> {
    const req = normalise(request)
    return this.isLive ? verifyNinInterswitch(req) : verifyNinMock(req)
  },
}
