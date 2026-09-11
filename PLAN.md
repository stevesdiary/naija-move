# NaijaMove Server — Execution Plan

## Stack

| Layer | Choice | Reason |
|---|---|---|
| Runtime | Node.js 22 LTS | Latest LTS, native ESM, improved perf |
| Language | TypeScript (ESM) | Type safety across all domain boundaries |
| Framework | Fastify | Low overhead, schema-first, plugin ecosystem |
| ORM | DrizzleORM | Type-safe SQL, migration-first, works well with Neon |
| Database | Neon Postgres | Serverless Postgres, branching for dev/staging |
| Realtime | `@fastify/websocket` | Bidirectional, trip-scoped channels |
| Queue | BullMQ + Upstash Redis | Persistent job state, concurrency, retries |
| Cron/Scheduled | QStash (Upstash) | HTTP-based cron triggers → enqueue BullMQ jobs. Same Upstash billing |
| Cache | Upstash Redis | Driver location cache, rate limiting, idempotency keys |
| Auth | JWT (access + refresh) | Stateless, mobile-friendly |
| SMS | Mock (Termii-shaped interface) | Swap for Termii/Twilio post-MVP without code changes |
| Maps | Mapbox + OSM/Nominatim | Mapbox for routing/ETA/geocoding; OSM as fallback for address search |
| Payments | Paystack (abstracted) | Primary provider; abstraction allows adding Flutterwave later |
| Testing | Vitest | Fast, ESM-native, co-located tests |
| Deploy | Render (web service) | Simple, supports always-on Node process |

---

## Realtime Architecture

```
Driver App (Flutter)
  └── WS /ws/trip/:tripId/driver
        └── streams GPS coords every ~3s
              └── Server caches location in Upstash Redis (key: loc:{tripId})
                    └── fans out to Rider WS channel on each GPS event
                          └── WS /ws/trip/:tripId/rider ← Rider App (Flutter)

Trip state events (arrived, started, completed, cancelled)
  └── emitted on same WS channels, scoped by tripId
```

- One Fastify WS server handles both driver and rider channels
- Trip-scoped: channels created on trip match, destroyed on trip end
- Driver location stored in Redis with short TTL (10s) — rider reconnects get last known position immediately
- Fan-out: push to rider WS on every driver GPS event if rider is connected, skip if not (no polling overhead)

---

## Queue Architecture

```
QStash (cron triggers)           BullMQ (job execution)          Upstash Redis
──────────────────────           ──────────────────────          ─────────────
settlement:nightly   ──POST──►   settlement-queue                job state
compliance:daily     ──POST──►   compliance-queue                job results
fraud:sweep          ──POST──►   fraud-queue                     rate limit keys
notification:retry   ──POST──►   notification-queue              idempotency keys
                                 payout-queue                    driver loc cache
                                 (enqueued directly by app)
```

- QStash hits `POST /internal/jobs/enqueue/:type` on schedule (signature-verified)
- That endpoint enqueues the appropriate BullMQ job
- BullMQ workers run as part of the same Fastify process (separate worker files, same process)
- Upstash Redis serves both BullMQ and the cache layer — single billing dashboard

---

## Project Structure

```
naijamove-server/
├── src/
│   ├── server.ts                        # Entry point — starts Fastify
│   ├── app.ts                           # Fastify instance, plugin registration
│   ├── config/
│   │   └── env.ts                       # Zod-validated env vars (fails fast on missing)
│   ├── db/
│   │   ├── index.ts                     # Neon + Drizzle client
│   │   └── schema/                      # One file per domain
│   │       ├── identity.ts
│   │       ├── riders.ts
│   │       ├── drivers.ts
│   │       ├── vehicles.ts
│   │       ├── rides.ts
│   │       ├── dispatch.ts
│   │       ├── pricing.ts
│   │       ├── wallets.ts
│   │       ├── ledger.ts
│   │       ├── payments.ts
│   │       ├── subscriptions.ts
│   │       ├── fleet.ts
│   │       ├── logistics.ts
│   │       ├── corporate.ts
│   │       ├── compliance.ts
│   │       ├── safety.ts
│   │       ├── notifications.ts
│   │       ├── support.ts
│   │       ├── promotions.ts
│   │       └── fraud.ts
│   ├── modules/                         # Bounded contexts — one folder each
│   │   ├── identity/                    # OTP, JWT, device management
│   │   │   ├── identity.routes.ts
│   │   │   ├── identity.service.ts
│   │   │   ├── identity.repository.ts
│   │   │   └── identity.schema.ts       # Zod request/response schemas
│   │   ├── riders/
│   │   ├── drivers/
│   │   ├── vehicles/
│   │   ├── rides/                       # Core trip lifecycle
│   │   ├── dispatch/                    # Matching engine
│   │   ├── pricing/                     # Fare engine + floor logic
│   │   ├── wallets/
│   │   ├── ledger/                      # Double-entry ledger
│   │   ├── payments/                    # Paystack webhooks + abstraction
│   │   ├── subscriptions/
│   │   ├── fleet/
│   │   ├── logistics/
│   │   ├── corporate/
│   │   ├── compliance/
│   │   ├── safety/                      # SOS, incident lifecycle
│   │   ├── notifications/               # Template registry + dispatch
│   │   ├── support/
│   │   ├── analytics/
│   │   ├── promotions/
│   │   └── fraud/
│   ├── websocket/
│   │   ├── index.ts                     # WS plugin registration
│   │   └── trip.ws.ts                   # Trip-scoped driver/rider channels
│   ├── queues/
│   │   ├── connection.ts                # Upstash Redis BullMQ connection
│   │   ├── queues.ts                    # Queue definitions
│   │   ├── enqueue.ts                   # Typed enqueue helpers
│   │   └── workers/
│   │       ├── settlement.worker.ts
│   │       ├── payout.worker.ts
│   │       ├── notification.worker.ts
│   │       ├── compliance.worker.ts
│   │       └── fraud.worker.ts
│   ├── providers/
│   │   ├── sms.ts                       # Mock SMS (Termii interface)
│   │   ├── maps.ts                      # Mapbox + OSM abstraction
│   │   └── payments.ts                  # Paystack abstraction
│   └── lib/
│       ├── jwt.ts                       # Sign/verify access + refresh tokens
│       ├── errors.ts                    # AppError class + Fastify error handler
│       ├── idempotency.ts               # Redis-backed idempotency key checks
│       └── rbac.ts                      # Role definitions + preHandler guard
├── drizzle/
│   └── migrations/
├── test/
│   └── modules/
│       ├── identity.test.ts
│       ├── rides.test.ts
│       ├── pricing.test.ts
│       ├── ledger.test.ts
│       └── payments.test.ts
├── drizzle.config.ts
├── vitest.config.ts
├── .env.example
├── .gitignore
├── tsconfig.json
└── package.json
```

Each module follows this internal pattern:
```
routes.ts       ← Fastify route definitions, Zod schemas, preHandlers
service.ts      ← Business logic, orchestrates repository + providers
repository.ts   ← Drizzle queries only, no business logic
schema.ts       ← Zod shapes for request/response validation
```

---

## Database Schema Overview

### Key design decisions
- All IDs: `uuid` (generated at app layer)
- All timestamps: `timestamptz` (UTC)
- Soft deletes via `deleted_at` where data must be retained (drivers, riders, trips)
- Ledger entries are **immutable** — insert-only, no updates
- Trip state machine enforced at app layer, stored as `enum` column
- All financial amounts stored as `bigint` in **kobo** (₦1 = 100 kobo) — no float precision issues

### Domain tables (summary)

| Domain | Core Tables |
|---|---|
| identity | `users`, `otp_requests`, `refresh_tokens`, `devices` |
| riders | `riders`, `saved_places`, `emergency_contacts` |
| drivers | `drivers`, `driver_documents`, `driver_status_history` |
| vehicles | `vehicles`, `vehicle_inspections`, `vehicle_insurance` |
| rides | `trips`, `trip_stops`, `trip_events`, `trip_ratings` |
| dispatch | `driver_offers`, `dispatch_attempts` |
| pricing | `pricing_configs`, `fare_quotes`, `surge_windows` |
| wallets | `wallets`, `wallet_transactions` |
| ledger | `ledger_entries` (immutable double-entry) |
| payments | `payment_intents`, `payment_callbacks`, `refunds` |
| subscriptions | `driver_plans`, `driver_subscriptions` |
| fleet | `fleet_owners`, `fleet_vehicles`, `fleet_assignments` |
| logistics | `delivery_jobs`, `delivery_proofs` |
| corporate | `corporate_accounts`, `corporate_wallets`, `corporate_trips` |
| compliance | `compliance_items`, `compliance_events` |
| safety | `safety_incidents`, `incident_events` |
| notifications | `notification_templates`, `notification_log` |
| support | `support_cases`, `case_messages`, `case_events` |
| promotions | `promotions`, `promo_redemptions`, `referrals` |
| fraud | `fraud_signals`, `fraud_reviews` |

---

## API Surface (MVP P0)

### Auth
```
POST /auth/otp/request
POST /auth/otp/verify
POST /auth/token/refresh
POST /auth/logout
```

### Riders
```
GET  /riders/me
PUT  /riders/me
GET  /riders/me/trips
POST /riders/me/saved-places
```

### Rides (core trip lifecycle)
```
GET  /rides/quote
POST /rides
GET  /rides/:id
POST /rides/:id/cancel
POST /rides/:id/stops
POST /rides/:id/rate
PUT  /rides/:id/destination
```

### Drivers
```
POST /drivers/register
GET  /drivers/me
POST /drivers/availability
GET  /drivers/offers
POST /drivers/offers/:id/accept
POST /drivers/offers/:id/decline
POST /drivers/trips/:id/arrive
POST /drivers/trips/:id/start
POST /drivers/trips/:id/complete
GET  /drivers/earnings
GET  /drivers/heatmap
```

### Payments
```
POST /payments/webhooks/paystack
GET  /payments/methods
POST /payments/methods
```

### Admin
```
GET  /admin/trips
GET  /admin/drivers
POST /admin/drivers/:id/approve
POST /admin/drivers/:id/suspend
GET  /admin/reports/marketplace
POST /admin/pricing
```

### Internal (QStash → BullMQ bridge)
```
POST /internal/jobs/enqueue/:type
```

### WebSocket
```
WS /ws/trip/:tripId/driver    ← driver streams GPS + state events
WS /ws/trip/:tripId/rider     ← rider receives location + state events
```

---

## Build Phases

### Phase 1 — Foundation
- [ ] `npm init`, TypeScript config (ESM, strict), Fastify app shell
- [ ] Zod env validation (`config/env.ts`) — fails on startup if vars missing
- [ ] Neon + Drizzle client (`db/index.ts`)
- [ ] `drizzle.config.ts`, migration setup
- [ ] Base error handler (`lib/errors.ts`)
- [ ] JWT lib (`lib/jwt.ts`) — sign/verify access (15m) + refresh (30d)
- [ ] RBAC guard (`lib/rbac.ts`) — roles: `rider | driver | admin | fleet_owner | corporate_admin`
- [ ] Vitest config + first smoke test
- [ ] `.env.example` with all required keys

### Phase 2 — All Drizzle Schemas + Initial Migration
- [ ] Write all schema files under `db/schema/`
- [ ] Run `drizzle-kit generate` + `drizzle-kit migrate` against Neon dev branch
- [ ] Verify all tables, enums, and foreign keys

### Phase 3 — Identity Module
- [ ] OTP request (mock SMS — logs to console in dev)
- [ ] OTP verify → issue JWT pair
- [ ] Refresh token rotation
- [ ] Device registration + session revocation
- [ ] Vitest: OTP flow, token refresh, duplicate device

### Phase 4 — Riders + Drivers + Vehicles (profiles)
- [ ] Rider profile CRUD, saved places, emergency contacts
- [ ] Driver registration, document upload stubs, status machine
- [ ] Vehicle registration, inspection/insurance records
- [ ] Admin: approve/suspend driver
- [ ] Vitest: driver status transitions, document expiry logic

### Phase 5 — Pricing Engine
- [ ] Pricing config per city/category (DB-stored, Redis-cached)
- [ ] Fare quote: base + per-km + per-min + booking fee
- [ ] Fare floor enforcement: fuel estimate + wear reserve + driver time value + platform fee
- [ ] Dynamic pricing cap enforcement
- [ ] Quote validity window (TTL in Redis)
- [ ] Vitest: floor enforcement, surge cap, quote expiry

### Phase 6 — Rides + Dispatch (core trip lifecycle)
- [ ] Trip state machine: `requested → matched → driver_arriving → driver_arrived → in_progress → completed | cancelled`
- [ ] Dispatch: find eligible nearby drivers, create offers with expiry timer
- [ ] Driver accept/decline, offer expiry → re-dispatch (max 3 attempts)
- [ ] Trip PIN generation + verification
- [ ] Multi-stop support
- [ ] Destination change with fare recalculation
- [ ] Cancellation with reason codes + fee logic
- [ ] Vitest: state transitions, dispatch timeout, PIN verification

### Phase 7 — WebSocket (Realtime)
- [ ] `@fastify/websocket` plugin registration
- [ ] Trip-scoped channels: driver + rider per `tripId`
- [ ] Driver GPS stream → Redis cache (`loc:{tripId}`, 10s TTL)
- [ ] Fan-out: push cached location to rider channel on each GPS event
- [ ] Trip state events broadcast on both channels
- [ ] Channel cleanup on trip end
- [ ] Reconnect: rider gets last cached location immediately on connect

### Phase 8 — Payments + Ledger + Wallet
- [ ] Paystack abstraction (`providers/payments.ts`) — initialize, verify, refund
- [ ] Idempotent webhook handler (`POST /payments/webhooks/paystack`)
- [ ] Double-entry ledger: every financial event → immutable debit/credit pair
- [ ] Wallet balance derived from ledger (no mutable balance column)
- [ ] Trip fare split: platform fee entry + driver payable entry
- [ ] Refund workflow with dual ledger reversal
- [ ] Vitest: ledger balance invariant, idempotent webhook replay, fare split

### Phase 9 — BullMQ + Upstash + QStash
- [ ] Upstash Redis connection for BullMQ (`queues/connection.ts`)
- [ ] Queue definitions: `settlement`, `payout`, `notification`, `compliance`, `fraud`
- [ ] Workers: one file each, registered on app start
- [ ] QStash bridge endpoint with signature verification
- [ ] QStash schedules: settlement nightly, compliance daily, fraud sweep hourly
- [ ] Vitest: worker job processing, QStash signature validation

### Phase 10 — Safety + Notifications + Support
- [ ] SOS trigger → high-priority safety incident → enqueue notification job
- [ ] Incident lifecycle: `open → assigned → resolved`
- [ ] Notification template registry (DB-backed, localization-ready)
- [ ] Mock SMS dispatch (console log, Termii interface shape)
- [ ] Push notification stub (FCM interface, not wired yet)
- [ ] Support case creation, message thread, status transitions
- [ ] Vitest: SOS flow, notification dispatch, case escalation

### Phase 11 — Remaining Modules
- [ ] Logistics: delivery job, driver matching, proof of delivery, pricing, settlement
- [ ] Corporate: account, wallet, employee trip policy, invoicing
- [ ] Fleet: owner, vehicle listing, driver-vehicle assignment
- [ ] Subscriptions: driver plans, billing status
- [ ] Promotions: promo creation, eligibility check, redemption, referral tracking
- [ ] Fraud: signal ingestion, GPS spoof detection, impossible travel, promo abuse flags
- [ ] Compliance: item registry, expiry tracking, activation blocker
- [ ] Analytics: marketplace report endpoint (aggregated, no raw PII)

### Phase 12 — Hardening + Deploy
- [ ] Rate limiting per endpoint + actor (`@fastify/rate-limit` + Redis)
- [ ] Request ID propagation + structured logging (`pino`)
- [ ] Health check endpoint (`GET /health`) — DB ping + Redis ping
- [ ] `render.yaml` — web service config, env var references
- [ ] Neon production branch + migration run
- [ ] Upstash Redis + QStash production credentials wired in Render
- [ ] Smoke test all P0 endpoints against Render deploy

---

## Environment Variables

```bash
# Server
NODE_ENV=
PORT=3000

# Database
DATABASE_URL=                  # Neon connection string

# Auth
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=

# Upstash Redis (BullMQ + cache)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# QStash
QSTASH_TOKEN=
QSTASH_CURRENT_SIGNING_KEY=
QSTASH_NEXT_SIGNING_KEY=

# Mapbox
MAPBOX_ACCESS_TOKEN=

# Paystack
PAYSTACK_SECRET_KEY=
PAYSTACK_WEBHOOK_SECRET=

# Internal
INTERNAL_JOB_SECRET=           # Shared secret for /internal/jobs/* endpoints
```

---

## Key Engineering Constraints (from PRD)

- All payment callbacks, trip completion, payout creation and ledger posting must be **idempotent** — client-generated request IDs + DB unique constraints
- Financial amounts stored as **bigint in kobo** (₦1 = 100 kobo)
- Ledger entries are **insert-only** — no updates, no deletes ever
- Trip state transitions are **explicit and logged** — every transition writes a `trip_events` row
- All external providers (SMS, maps, payments) are **behind adapters** — never called directly from business logic
- Pricing changes require **effective timestamps** — historical trips must be reconstructable
- Compliance requirements are **versioned by jurisdiction** — no hardcoded Lagos-only rules
- Driver activation is **blocked** until all compliance items pass — checklist is DB-driven, not code-driven

---

## Open Decisions (resolve before Phase 5–6)

| Decision | Options | Recommendation |
|---|---|---|
| Driver location update interval | 2s / 3s / 5s | 3s — balance between accuracy and battery/bandwidth |
| Offer expiry timer | 15s / 20s / 30s | 20s — enough time without making rider wait too long |
| JWT access token TTL | 15m / 1h | 15m with silent refresh on mobile |
| Cash trip policy at MVP | Allow / Block | Allow with manual reconciliation flag on trip |
| Fare quote TTL | 2min / 5min | 5min — enough for rider to confirm |
| Re-dispatch attempts before "no drivers" | 3 / 5 | 3 attempts × 20s each |
| Driver location fan-out strategy | Push on GPS event / Poll Redis | Push on GPS event if rider WS connected, skip if not |
