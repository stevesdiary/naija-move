# NaijaMove Server

Backend API for NaijaMove — a ride-hailing and logistics platform for Nigeria. Serves the rider app, driver app, and admin tooling over REST + WebSockets.

## Stack

| Layer | Choice |
|---|---|
| Runtime | Node.js 22 LTS, TypeScript (ESM) |
| Framework | [Fastify 5](https://fastify.dev) |
| Database | [Neon Postgres](https://neon.tech) via [Drizzle ORM](https://orm.drizzle.team) |
| Realtime | `@fastify/websocket` (trip-scoped channels) |
| Queues | [BullMQ](https://bullmq.io) on Upstash Redis |
| Scheduled jobs | [QStash](https://upstash.com/docs/qstash) → `POST /internal/jobs/enqueue/:type` |
| Cache / rate limiting / idempotency | Upstash Redis |
| Auth | JWT (access + refresh), phone OTP |
| Maps | Mapbox |
| Payments | Paystack |
| SMS | Mock (Termii-shaped interface) |
| Testing | Vitest |
| Deploy | Render |

See [PLAN.md](./PLAN.md) for the full architecture and execution plan.

## Getting started

### Prerequisites

- Node.js 22+
- A Neon Postgres database
- An Upstash Redis database (REST URL + IORedis-compatible `rediss://` URL)
- Upstash QStash, Mapbox, and Paystack credentials (test keys are fine locally)

### Install

```bash
npm install
cp .env.example .env
# fill in .env — every variable is validated on boot (see src/config/env.ts)
```

### Database

```bash
npm run db:generate   # generate SQL migrations from src/db/schema/*
npm run db:migrate    # apply migrations to DATABASE_URL
npm run db:studio     # open Drizzle Studio
```

Migrations are versioned in `drizzle/migrations/` (the baseline is `0000_*`).
`db:migrate` runs `scripts/migrate.ts`, which uses the app's own pool so the
`DATABASE_CERT`-pinned TLS config applies. `npm run db:tables` lists what's in
the target database.

The DB driver is `drizzle-orm/node-postgres` (`pg`) with TLS verified against `DATABASE_CERT`; the previous Neon client could not reach a non-Neon Postgres. 
the ledger, wallet and promotion paths rely on transactions and `SELECT … FOR UPDATE`.

### Create the first admin

```bash
ADMIN_PASSWORD='…' npx tsx scripts/create-admin.ts --email ops@naijamove.com --phone +2348000000000 --name "Ops Lead"
```

Re-running with an existing email rotates the password. Never pass the password
as a flag — it's read from `ADMIN_PASSWORD` or prompted.

### Run

```bash
npm run dev           # tsx watch — hot reload on http://localhost:3000
npm run build         # tsc → dist/
npm start             # node dist/server.js
```

Health check: `GET /health`

### Test

```bash
npm test              # vitest run
npm run test:watch
npm run test:coverage # v8 coverage → coverage/
```

Tests live in `test/` and mock Redis, SMS, and env so no external services are required.

## Environment variables

All variables are required unless a default is listed. The server exits on boot if any are missing or invalid.

| Variable | Notes |
|---|---|
| `NODE_ENV` | `development` \| `test` \| `production` (default `development`) |
| `PORT` | default `3000` |
| `DATABASE_URL` | Postgres connection string (`sslmode=require`) |
| `DATABASE_CERT` | Optional PEM CA for the DB host (Aiven "Project CA"); enables strict TLS verification |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | `openssl rand -hex 32` each; must differ. Boot is refused on `change-me*` placeholders |
| `REDIS_URL` | IORedis-compatible `rediss://` URL (BullMQ) |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Upstash REST client (cache, rate limit, idempotency) |
| `QSTASH_TOKEN` / `QSTASH_CURRENT_SIGNING_KEY` / `QSTASH_NEXT_SIGNING_KEY` | QStash publish + signature verification |
| `MAPBOX_ACCESS_TOKEN` | Routing, ETA, geocoding |
| `PAYSTACK_SECRET_KEY` / `PAYSTACK_WEBHOOK_SECRET` | Payments + webhook verification |
| `INTERNAL_JOB_SECRET` | `openssl rand -hex 32`; guards `/internal` routes and `x-internal-secret` callers |
| `APP_URL` | Public URL QStash calls back to |
| `B2_ENDPOINT` / `B2_REGION` / `B2_KEY_ID` / `B2_APPLICATION_KEY` / `B2_BUCKET` | Backblaze B2 (S3-compatible). All five or none; uploads return 501 when unset |
| `TRUST_PROXY` | Proxy hops to trust for `X-Forwarded-For` (default `0`). Set to `1` behind a load balancer, or rate limiting keys on the LB's IP |
| `CORS_ORIGINS` | Comma-separated browser origins (default `http://localhost:5173`, the dashboard dev server) |

## Project structure

```
src/
├── app.ts                  # buildApp(): plugins, error handler, route registration
├── server.ts               # entrypoint: listen + start BullMQ workers
├── config/env.ts           # zod-validated environment
├── db/
│   ├── index.ts            # Drizzle + Neon client
│   └── schema/             # one file per domain (identity, rides, wallets, ledger, …)
├── lib/
│   ├── errors.ts           # AppError + global error handler
│   ├── jwt.ts              # sign/verify access & refresh tokens
│   ├── rbac.ts             # authenticate / authorize(...roles) preHandlers
│   └── idempotency.ts      # Redis client + idempotency-key helpers
├── modules/<domain>/       # routes → service → repository, with zod schemas
├── providers/              # maps (Mapbox), payments (Paystack), sms (mock)
├── queues/
│   ├── queues.ts           # settlement, payout, notification, compliance, fraud
│   ├── enqueue.ts
│   └── workers/            # one worker per queue, started from server.ts
└── websocket/trip.ws.ts    # live trip channels
```

Each module follows the same layout:

```
modules/rides/
├── rides.routes.ts      # Fastify plugin, registered with a prefix in app.ts
├── rides.schema.ts      # zod request/response schemas
├── rides.service.ts     # business logic
└── rides.repository.ts  # Drizzle queries
```

## API surface

All routes are registered in `src/app.ts`. Prefixes:

| Prefix | Module |
|---|---|
| `/auth` | Phone OTP login, token refresh, logout |
| `/riders` | Rider profiles |
| `/drivers` | Driver onboarding, status, earnings |
| `/vehicles` | Vehicle registration and documents |
| `/rides` | Ride request, match, lifecycle |
| `/pricing` | Fare estimates, surge |
| `/payments` | Wallets, Paystack charges, webhooks, ledger |
| `/safety` | SOS, trip sharing, incident reports |
| `/notifications` | Push/SMS preferences and history |
| `/support` | Tickets |
| `/logistics` | Package delivery |
| `/corporate` | Business accounts |
| `/fleet` | Fleet owners and assigned drivers |
| `/subscriptions` | Driver/rider plans |
| `/promotions` | Promo codes and referrals |
| `/fraud` | Fraud flags and reviews |
| `/compliance` | Document expiry and regulatory checks |
| `/analytics` | Reporting |
| `/admin` | Admin operations (role-gated) |
| `/internal` | QStash-triggered job enqueue (signature-verified) |

### Auth

Send `Authorization: Bearer <accessToken>` on protected routes. Roles are enforced with `authorize(...roles)` from `src/lib/rbac.ts`.

```
POST /auth/otp/request    { phone }
POST /auth/otp/verify     { phone, code }        → { accessToken, refreshToken }   riders & drivers
POST /auth/admin/login    { email, password }    → { accessToken, refreshToken }   admins only
POST /auth/token/refresh  { refreshToken }
POST /auth/logout         (authenticated)
POST /drivers/register    (rider)                → { driver, accessToken, refreshToken }
```

**Role model.** The token role is read from `users.role` at login and again on
every refresh, so deactivating an account or changing its role takes effect
within one access-token lifetime (15 min). New phone sign-ups are `rider`;
`POST /drivers/register` promotes a rider to `driver` (profile stays `pending`
until an admin approves it) and returns a fresh token pair. `admin` accounts
authenticate only with email + password (scrypt) — SMS OTP is refused for them.

**Ownership.** Authorization is enforced in the service layer, not just the
route: trips, delivery jobs, incidents, support cases, corporate accounts and
fleet vehicles all check the caller is the owner (or an admin) before reading or
mutating. JWT `sub` is the *user* id; trips/offers/jobs reference the rider or
driver *profile* id — resolve with `riderIdFor` / `driverIdFor` from
`src/lib/actors.ts` rather than comparing `req.user.sub` directly.

**Secrets & brute force.** OTPs, pickup PINs and delivery OTPs come from
`crypto.randomInt`, are compared in constant time, and lock after 5 wrong
guesses. Delivery OTPs are sent to the recipient at job creation and are never
accepted from the driver.

### WebSockets

```
GET /ws/trip/:tripId/driver   # driver streams GPS every ~3s
GET /ws/trip/:tripId/rider    # rider receives location + trip state events
```

Both channels require the access token — `Authorization: Bearer <token>` or, for
clients that can't set upgrade headers, `?token=<token>` — and the caller must be
that trip's rider or driver. The upgrade is refused with 401/403 otherwise, and
with 422 once the trip is completed or cancelled.

Driver location is cached in Redis (`loc:{tripId}`, short TTL) and fanned out to the rider channel on each update. Trip state events (`arrived`, `started`, `completed`, `cancelled`) are emitted on the same channels.

### File uploads (Backblaze B2)

Files go **directly from the client to a private B2 bucket** via the S3 API;
the server only hands out presigned URLs, so no B2 credentials ever reach an
app.

```
POST /uploads/presign { purpose, contentType, sizeBytes }
  → { key, uploadUrl, headers, expiresAt }        # 15-min PUT URL bound to type + length
PUT  <uploadUrl>  (send `headers` verbatim)        # straight to B2
POST /drivers/documents { type, fileKey: key }     # server checks key ∈ your namespace and object exists
GET  /drivers/documents/:id/url → { url }          # 10-min presigned read; owner or admin
```

Keys are `<purpose>/<userId>/<uuid>.<ext>`, so ownership is verifiable from the
path alone. Allowed types: JPEG, PNG, WebP, PDF; max 10 MiB. `npm run
storage:check` round-trips a test object against the configured bucket.

B2 setup: create a **private** bucket, then an application key restricted to
that bucket with read/write. If the admin dashboard will upload from a
browser, add a CORS rule on the bucket for the dashboard origin (mobile uploads
need none).

### Rate limiting

Global: 100 requests / minute per client IP, backed by Redis. `POST /auth/admin/login`
is additionally capped at 5 / minute. Request bodies are limited to 256 KiB and
list endpoints clamp `limit` to 100.

## Background jobs

| Queue | Trigger |
|---|---|
| `settlement` | QStash nightly → `/internal/jobs/enqueue/settlement` |
| `compliance` | QStash daily |
| `fraud` | QStash sweep |
| `notification` | QStash retry + direct enqueue from app |
| `payout` | Enqueued directly by the app |

Workers are started in-process from `src/server.ts` after the HTTP server is listening.

## Deployment

Deployed to Render as a single always-on web service:

- Build: `npm install && npm run build`
- Start: `npm start`
- Set every variable from `.env.example` in the Render dashboard
- Point QStash schedules at `${APP_URL}/internal/jobs/enqueue/<type>`
- Point the Paystack webhook at `${APP_URL}/payments/webhooks/paystack`
