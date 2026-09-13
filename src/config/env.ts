import { z } from 'zod'
import 'dotenv/config'

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),

  DATABASE_URL: z.string().min(1),
  /** PEM CA certificate for the Postgres host (Aiven "Project CA"). When set, TLS is verified against it. */
  DATABASE_CERT: z.string().optional(),

  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),

  REDIS_URL: z.string().min(1),
  UPSTASH_REDIS_REST_URL: z.string().min(1),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),

  QSTASH_TOKEN: z.string().min(1),
  QSTASH_CURRENT_SIGNING_KEY: z.string().min(1),
  QSTASH_NEXT_SIGNING_KEY: z.string().min(1),

  // Map providers (at least one routing + one geocoding required)
  MAPBOX_ACCESS_TOKEN: z.string().optional(),
  MAPTILER_TOKEN: z.string().optional(),
  STADIA_MAPS_TOKEN: z.string().optional(),
  OPENROUTESERVICE_TOKEN: z.string().optional(),
  GRAPHHOPPER_TOKEN: z.string().optional(),

  PAYSTACK_SECRET_KEY: z.string().min(1),
  PAYSTACK_WEBHOOK_SECRET: z.string().min(1),

  INTERNAL_JOB_SECRET: z.string().min(32),

  APP_URL: z.string().url(),

  // Backblaze B2 (S3-compatible). Optional: when unset, upload presigning is disabled (501).
  B2_ENDPOINT: z.string().url().optional(),          // e.g. https://s3.us-west-004.backblazeb2.com
  B2_REGION: z.string().optional(),                  // e.g. us-west-004
  B2_KEY_ID: z.string().optional(),
  B2_APPLICATION_KEY: z.string().optional(),
  B2_BUCKET: z.string().optional(),

  /** Set to the number of proxy hops (e.g. 1 behind a load balancer) so rate limiting keys on the real client IP. */
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
  /** Comma-separated browser origins allowed to call the API (the admin dashboard). */
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
})

const parsed = schema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌ Invalid environment variables:')
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

// Refuse to run with the placeholder secrets that ship in .env.example — a
// forged admin JWT is one `jwt.sign` away otherwise.
const SECRET_KEYS = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'INTERNAL_JOB_SECRET'] as const
for (const key of SECRET_KEYS) {
  if (/^change[-_]?me/i.test(parsed.data[key])) {
    console.error(`❌ ${key} is still the placeholder value — generate one with: openssl rand -hex 32`)
    process.exit(1)
  }
}
const b2 = [parsed.data.B2_ENDPOINT, parsed.data.B2_REGION, parsed.data.B2_KEY_ID, parsed.data.B2_APPLICATION_KEY, parsed.data.B2_BUCKET]
if (b2.some(Boolean) && !b2.every(Boolean)) {
  console.error('❌ B2_ENDPOINT, B2_REGION, B2_KEY_ID, B2_APPLICATION_KEY and B2_BUCKET must be set together')
  process.exit(1)
}

if (parsed.data.JWT_ACCESS_SECRET === parsed.data.JWT_REFRESH_SECRET) {
  console.error('❌ JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must differ')
  process.exit(1)
}

export const env = parsed.data
