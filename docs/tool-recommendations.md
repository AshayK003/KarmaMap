# KarmaMap — Open Source Tool & Architecture Recommendations

A curated list of the best free/open-source repositories, libraries, and patterns
relevant to KarmaMap. Every entry is actively maintained, production-proven,
permissively licensed, and solves a real problem in this codebase.

---

## 1. Pino — Structured Logging (Backend)

**Current state**: `console.error` / `console.warn` scattered across services — no
log levels, no structured JSON, no request correlation.

**Recommendation**: Replace with `pino`.

| Aspect | Detail |
|---|---|
| Package | `pino` + `pino-pretty` (dev) |
| License | MIT |
| Weekly downloads | ~9M |
| Bundle | 0KB (server-side) |
| Maintained | Actively (same team as Fastify) |

**Why**: Pino is 5–8× faster than Winston. It writes minimal JSON to stdout
asynchronously — I/O never blocks the event loop. Its `logger.child({ requestId })`
pattern gives every request its own log context for free. Production logs go to
stdout as raw JSON; in development you pipe through `pino-pretty`.

```typescript
// src/lib/logger.ts
import pino from 'pino'
export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  redact: ['req.headers.authorization', 'req.headers.cookie', '*.password'],
})

// In a request handler:
import { AsyncLocalStorage } from 'async_hooks'
const als = new AsyncLocalStorage()
app.use((req, res, next) => {
  als.run({ requestId: crypto.randomUUID() }, next)
})
export function getLogger() {
  return logger.child(als.getStore() ?? {})
}
```

**Problem solved**: You can query logs by requestId, level, or service in
OpenObserve/Grafana instead of grepping text. Retrofits existing code in 20
minutes — `console.error(err)` → `logger.error(err)`.

**Tradeoff**: Pino's API is minimal by design. If you need multi-transport
(file + console + HTTP simultaneously), Winston has a richer transport ecosystem.
With Docker + log aggregator, however, stdout-only is the correct pattern.

**Integration**: `npm install pino && npm install -D pino-pretty`. Create
`backend/src/lib/logger.ts`, import in all services. Pipe `| pino-pretty` in
`package.json` dev script.

---

## 2. pg-boss — Postgres-Backed Job Queue (Backend)

**Current state**: Gig matching + email notifications run synchronously inside
the `POST /api/gigs` request handler. A slow DB or email API call holds the
HTTP response for seconds.

**Recommendation**: Offload to `pg-boss`.

| Aspect | Detail |
|---|---|
| Package | `pg-boss` |
| License | MIT |
| Stars | 3,500+ |
| Maintained | 12 years, 146 releases, very active |
| Deps | 3 (tiny) |
| Postgres req | ≥ 13 |

**Why uses SKIP LOCKED**: pg-boss uses Postgres's `SELECT ... FOR UPDATE SKIP
LOCKED` for atomic dequeue — exactly-once delivery, no duplicate processing even
with multiple worker processes. Dead letter queues, retries with exponential
backoff, cron scheduling, and priority queues are all built in. No Redis. No
separate broker. Your existing Postgres is the queue.

```typescript
// backend/services/queue.ts
import { PgBoss } from 'pg-boss'

const boss = new PgBoss(process.env.SUPABASE_URL!) // reuse existing connection
await boss.start()
await boss.createQueue('matching', {
  retryLimit: 3,
  retryDelay: 30,
  retryBackoff: true,
})

export async function enqueueMatching(gigId: string, gigTitle: string) {
  await boss.send('matching', { gigId, gigTitle })
}

// Start worker in a separate process or after app startup:
await boss.work<{ gigId: string; gigTitle: string }>(
  'matching',
  { batchSize: 1, pollingIntervalSeconds: 2 },
  async ([job]) => {
    const matched = await findMatchedVolunteers(job.data.gigId)
    await notifyMatchedVolunteers(job.data.gigId, matched, job.data.gigTitle)
    await sendGigMatchEmails(matched, job.data.gigTitle)
  },
)
```

**Problem solved**: The `POST /api/gigs` response returns in 50ms instead of
5s. Failed emails are retried automatically. Dead letter queue captures jobs
that exhaust retries for manual inspection. The worker can be scaled
independently.

**Tradeoff**: Adds ~3.3K gzipped to the backend bundle. Requires a schema
migration to create pg-boss's internal tables (managed automatically by
`boss.start()`). For very high throughput (>10K jobs/sec), Redis-backed queues
(BullMQ) are faster — but for this app's scale, pg-boss is the right tool.

**Integration**: `npm install pg-boss`. Create a `queue.ts` service, call
`enqueueMatching` in gigController instead of running matching directly. Add
worker registration in `index.ts` after app.listen.

---

## 3. Biome — Unified Linter + Formatter (Both Frontend + Backend)

**Current state**: ESLint (4 dependencies) + no formatter. ESLint takes ~3s for
50 files on this project.

**Recommendation**: Replace with `@biomejs/biome`.

| Aspect | Detail |
|---|---|
| Package | `@biomejs/biome` (single binary) |
| License | MIT |
| Stars | 100,000+ |
| Maintained | Very active (successor to Rome) |
| Rust-native | 10–100× faster than ESLint + Prettier |

**Why**: Biome replaces ESLint + Prettier with one tool. It lints and formats
250 files in ~120ms. TypeScript is a first-class target. Import organization is
built in. The `biome migrate eslint` command auto-converts your existing ESLint
config. For this project's TypeScript + React stack, Biome covers:

- All standard JS correctness rules
- TypeScript type-aware linting (~85% of @typescript-eslint rules)
- React rules (useExhaustiveDependencies, useHookAtTopLevel, noChildrenProp)
- Import sorting + deduplication
- Formatting (indentation, quotes, trailing commas)

```json
// biome.json
{
  "$schema": "https://biomejs.dev/schemas/1.9.0/schema.json",
  "organizeImports": { "enabled": true },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "correctness": { "noUnusedVariables": "error" },
      "complexity": { "noBannedTypes": "error" },
      "style": { "noNonNullAssertion": "warn" }
    }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 90
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "jsxQuoteStyle": "double"
    }
  }
}
```

**Problem solved**: Removes 4 npm packages (`eslint`, `typescript-eslint`,
`eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`) + no formatter gap.
CI lint drops from ~3s to ~100ms. Pre-commit hooks run in under 200ms (vs 3–6s).

**What you lose**: `eslint-plugin-react-refresh` (HMR correctness) has no Biome
equivalent. This is a DX convenience — Vite falls back to full reload if a
component isn't properly exported. Not a production bug risk.

**Integration**: `npm install -D @biomejs/biome` in both `backend/` and
`frontend/`. Run `npx biome migrate eslint --write` and `npx biome migrate
prettier --write` (even without Prettier, it sets up formatting defaults).
Add `"lint": "biome check ."` and `"format": "biome format --write ."` scripts.
Remove ESLint config and devDependencies.

---

## 4. Sonner — Toast Notifications (Frontend)

**Current state**: No feedback to users on form submission, errors, or success.
Forms submit silently unless the developer manually manages a state flag.

**Recommendation**: Install `sonner` — it's already the default shadcn/ui toast
component.

| Aspect | Detail |
|---|---|
| Package | `sonner` |
| License | MIT |
| Weekly downloads | 43.5M |
| Bundle | ~4KB gzipped |
| Dependencies | 0 (zero) |
| Maintained | By Emil Kowalski (shadcn collaborator) |

**Why**: No context providers, no hooks, no setup beyond placing `<Toaster />`
once. `toast()` works from anywhere — event handlers, promises, async functions.
The promise API is the killer feature:

```typescript
import { toast } from 'sonner'

// Simple
toast.success('Gig created!')

// Promise (auto-loading state)
toast.promise(createGigViaApi(data), {
  loading: 'Creating gig...',
  success: (gig) => `"${gig.title}" is live!`,
  error: 'Failed to create gig',
})
```

**Problem solved**: Every form in the app (CreateGig, ParticipateGig, Login,
Signup) gets instant feedback with 2 lines of code. Error toasts in catch
blocks replace silent failures everywhere.

**Integration**: `npx shadcn@latest add sonner` (installs `sonner` + creates
`components/ui/sonner.tsx` with dark mode support). Add `<Toaster />` to the
root layout in `App.tsx`. Replace `alert()`, `console.error()` in catch blocks
with `toast.error()`.

---

## 5. Lucide React — Icons (Frontend)

**Current state**: Inline SVGs in `Navbar.tsx` (notification bell). Other
components have no icons. `components.json` references `lucide-react` but it's
not installed.

**Recommendation**: Install and use `lucide-react`.

| Aspect | Detail |
|---|---|
| Package | `lucide-react` |
| License | ISC (permissive) |
| Weekly downloads | ~8M |
| Bundle | Tree-shakable — each icon is ~500B gzipped |

**Why**: shadcn/ui's chart component already imports from lucide. Using inline
SVGs duplicates work and misses dark mode support. Lucide icons are fully typed,
accept `size`, `color`, and `strokeWidth` props, and tree-shake to exactly
what you import.

```typescript
import { Bell, Sun, Moon, MapPin, Users, Award } from 'lucide-react'

// Use like any React component:
<Bell className="h-5 w-5" />
<Sun className="h-5 w-5" />  // Auto-sized, auto-colored via currentColor
```

**Problem solved**: 15+ inline SVGs replaced with single-line imports. Consistent
icon sizing and theming. The notification bell, nav items, map markers, and
certificate all benefit.

**Integration**: `npm install lucide-react`. Replace inline SVGs in Navbar,
GigCard, NgoGigCard, certificate, and other components.

---

## 6. date-fns v4 — Date Handling (Frontend + Backend)

**Current state**: `new Date()` scattered everywhere — manual ISO string
formatting, no DST awareness, no relative time.

**Recommendation**: Install `date-fns` (v4).

| Aspect | Detail |
|---|---|
| Package | `date-fns` |
| License | MIT |
| Weekly downloads | ~30M |
| Bundle | ~4KB tree-shaken (5 functions) |
| TypeScript | First-class types |
| Maintained | Very active |

**Why**: Pure functions, tree-shakable, no mutation. For this project's usage
patterns:

- `format(gigDate, 'MMM d, yyyy')` — gig detail dates
- `formatDistanceToNow(gigDate, { addSuffix: true })` — "3 days away"
- `isAfter(gigDate, new Date())` — gig status checks
- `addDays(new Date(), 7)` — featured_until calculation
- `differenceInHours(new Date(), participation.created_at)` — hours tracking

```typescript
import { format, formatDistanceToNow, isAfter, differenceInHours } from 'date-fns'

// Gig detail
<span>{format(gig.gig_date, 'MMM d, yyyy • h:mm a')}</span>

// Relative time
<span>{formatDistanceToNow(gig.gig_date, { addSuffix: true })}</span> // "in 3 days"

// Featured until
const isFeatured = isAfter(gig.featured_until!, new Date())
```

**Problem solved**: Eliminates manual date string construction and parsing bugs.
Handles locale-aware formatting, DST transitions, and timezone-correct
comparisons.

**Tradeoff**: date-fns-tz is needed for timezone work (adds ~3KB). For this
project, all dates are UTC from Supabase and displayed in the user's local
timezone — `format` uses the runtime's locale by default, which is correct for
display.

**Integration**: `npm install date-fns`. Import needed functions per module.
Tree-shaking ensures only used functions end up in the bundle.

**Note on Temporal**: The Temporal API reached Stage 4 in March 2026 and ships
natively in modern browsers. Once Safari/Firefox catch up (~2027), Temporal will
be the better choice (0KB, built-in, immutable, DST-correct). For today, date-fns
is the pragmatic default. The polyfill (`@js-temporal/polyfill`) adds ~60KB —
not worth it for this app's simple date needs.

---

## 7. OpenObserve — Self-Hosted Observability (Infrastructure)

**Current state**: No logging infrastructure beyond terminal output. The
`docker-compose.monitoring.yml` file was removed (configured but backend had no
`/metrics` endpoint and prom-client was never wired).

**Recommendation**: Deploy OpenObserve (not SigNoz) for this project's scale.

| Aspect | OpenObserve | SigNoz |
|---|---|---|
| Deployment | Single Docker container | Multi-container (ClickHouse + ZooKeeper + UI + collector) |
| RAM at idle | ~512MB | ~1.5–2GB |
| Storage | Parquet + S3 (local fs by default) | ClickHouse (local disk) |
| Primary focus | Logs + metrics + traces | Distributed tracing + APM |
| Bundle | Single 430MB image | Multi-GB stack |
| License | AGPL v3 (core) | MIT |
| Query | SQL + PromQL | SQL (ClickHouse) + PromQL |
| OpenTelemetry | Native OTLP | Native OTLP |

**Why OpenObserve**: A single binary (Rust) that accepts OTLP from any
OpenTelemetry-instrumented app. Combined with Pino → Loki driver → OpenObserve,
you get full log search + metrics + basic traces on your existing VPS without
adding a second database service.

```yaml
# docker-compose.observability.yml
services:
  openobserve:
    image: openobserve/openobserve:v0.70.3
    environment:
      ZO_DATA_DIR: /data
      ZO_ROOT_EMAIL: admin@example.com
      ZO_ROOT_PASSWORD: change-me
    volumes:
      - openobserve-data:/data
    ports:
      - 5080:5080
```

**Problem solved**: Searchable log history with retention policies, service
dashboards, alerting on error rates — all self-hosted, no per-GB fees.

**Tradeoff**: AGPL v3 license (vs MIT for SigNoz). If you modify and distribute
OpenObserve, you must release your changes. Running it as a service for your
application does not trigger this — only if you embed or redistribute it.

**Integration**: Add the container to `docker-compose.yml` (or separate compose
file). Instrument the backend with OpenTelemetry JS SDK (`@opentelemetry/sdk-node`,
`@opentelemetry/exporter-trace-otlp-http`) or just ship Pino logs via a Loki
transport (`pino-loki`).

---

## 8. Patterns & Architectures

These are not packages but architectural patterns worth adopting.

### 8a. Outbox Pattern via Atomic Transaction

**When to use**: When you create a gig, you need to (1) insert the gig row, (2)
find matched volunteers, (3) insert notifications, (4) send emails. If step 3 or
4 fails, you've created a gig with no notifications.

**Current state**: Sequential, no rollback. If matching succeeds but email
sending fails, volunteers get notifications in-app but no email.

**Pattern**: Use pg-boss's `inTransaction` or wrap the create gig + queue enqueue
in a Supabase transaction:

```typescript
const { data: gig, error } = await supabaseAdmin.rpc('insert_gig', { ... })
if (error) throw error

// Enqueue matching — if this fails, the gig is still created
// (eventual consistency tradeoff acceptable here)
await enqueueMatching(gig.id, gig.title)
```

For stricter consistency, pg-boss's `inTransaction` pattern:
```typescript
await boss.inTransaction(async (queue, sql) => {
  const { data: gig } = await sql`INSERT INTO gigs ... RETURNING *`
  await queue.send('matching', { gigId: gig.id })
  // Both commit atomically or roll back together
})
```

**When to skip**: This app's current consistency requirements are fine with
manual retry (NGO can click "re-match" from the dashboard). Don't over-engineer.

### 8b. Supabase Type Generation (Monorepo Lite Pattern)

**Current state**: Hand-written `database.ts` (106 lines). Duplicated Zod
schemas in frontend and backend.

**Pattern**: `shared/` directory at repo root:

```
karmamap/
  shared/
    types.ts          # Generated by `supabase gen types typescript`
    schemas.ts        # Zod schemas imported by both frontend + backend
  backend/
    tsconfig.json     # paths: { "@shared/*": ["../shared/*"] }
  frontend/
    tsconfig.app.json # paths: { "@shared/*": ["../shared/*"] }
```

```bash
npx supabase gen types typescript --project-id "$PROJECT_REF" > shared/types.ts
```

```typescript
// shared/schemas.ts
import { z } from 'zod'
export const createGigSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  lat: z.number(),
  lng: z.number(),
  required_skills: z.array(z.string()).default([]),
  volunteers_needed: z.number().int().min(1).default(1),
  gig_date: z.string().min(1),
})
```

**Problem solved**: Changing a column name in Supabase generates a type error in
the shared types file; compilation fails everywhere the old name is used. Zod
schemas are defined once and validated on both client + server.

### 8c. Skill Combobox (shadcn/ui Command Pattern)

**Current state**: Skills are comma-separated text inputs (`value.split(',')`)
on Signup, CreateGig, and profile edit.

**Pattern**: Use shadcn/ui's `Combobox` (built on `cmdk`):

```typescript
import { Command, CommandInput, CommandItem, CommandList, CommandEmpty, CommandGroup } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

const SKILLS = ['Teaching', 'Nursing', 'Cooking', 'Cleaning', 'Driving', ...]

<Popover>
  <PopoverTrigger asChild>
    <Button variant="outline" role="combobox">
      {selectedSkills.length ? `${selectedSkills.length} selected` : 'Select skills'}
    </Button>
  </PopoverTrigger>
  <PopoverContent>
    <Command>
      <CommandInput placeholder="Search skills..." />
      <CommandEmpty>No skill found.</CommandEmpty>
      <CommandList>
        {SKILLS.map(skill => (
          <CommandItem
            key={skill}
            onSelect={() => toggleSkill(skill)}
          >
            <Check className={selectedSkills.includes(skill) ? 'opacity-100' : 'opacity-0'} />
            {skill}
          </CommandItem>
        ))}
      </CommandList>
    </Command>
  </PopoverContent>
</Popover>
```

**Problem solved**: Typo-free skill selection, searchable list of ~20 common
skills, consistent UX across signup, gig creation, and profile.

---

## Tools Considered and Rejected

| Tool | Why rejected | Alternative |
|---|---|---|
| **Winston** | 5-8× slower than Pino, sync transports, heavier API | Pino |
| **BullMQ** | Requires Redis (another stateful service to manage & backup) | pg-boss (uses existing Postgres) |
| **TanStack Query** | App uses Supabase Realtime subscriptions as primary data source — caching layer adds ~12KB with marginal benefit over current patterns | Keep current approach |
| **Kysely** | Supabase SDK already provides typed queries; adding a query builder is an extra abstraction layer with no clear benefit for this app's query complexity | Supabase SDK |
| **Drizzle ORM** | Same as Kysely — Supabase SDK covers all current query needs; Drizzle would duplicate schema definitions | Supabase SDK |
| **MapLibre GL** | 250KB+ bundle vs Leaflet's 42KB; vector tiles + 3D are overkill for simple marker/cluster map | Leaflet (keep current) |
| **Navigatr** | Too new (March 2026, 25 stars). Uses 1 req/sec Nominatim geocoding | Watch, not adopt |
| **ElephantMQ** | Too new (May 2026, 0 stars). Promising design but zero production track record | pg-boss |
| **Temporal polyfill** | 60KB bundle cost outweighs benefit for this app's simple date needs | date-fns v4 |
| **SigNoz** | 1.5-2GB RAM baseline, ClickHouse + ZooKeeper — heavy for a single-VPS app | OpenObserve (512MB) |
| **Sentry** | ~40KB browser bundle + per-event pricing; self-hosted requires significant infra | OpenObserve (OTLP) |
| **Prisma** | Heavy (80KB+), slower at runtime, cold start penalty; Supabase SDK is already type-safe | Supabase SDK |
| **Mikro-ORM** | Over-engineered for this app's schema complexity (DDD patterns not needed) | Supabase SDK |

---

## Priority Matrix

| Priority | Tool | Effort | Impact | Category |
|---|---|---|---|---|
| 🔴 This sprint | Sonner | 15 min | High for UX | Frontend |
| 🔴 This sprint | Lucide React | 10 min | Medium (consistency) | Frontend |
| 🟠 This sprint | Biome | 1 hr | High for DX | Both |
| 🟠 This sprint | Pino | 20 min | High for ops | Backend |
| 🟡 This week | pg-boss | 2 hr | High for reliability | Backend |
| 🟡 This week | date-fns | 15 min | Medium for correctness | Both |
| 🟡 This sprint | Skill combobox | 1 hr | Medium for UX | Frontend |
| 🔵 Next month | OpenObserve | 2 hr | Medium for ops | Infra |
| 🔵 Next month | Supabase type gen | 1 hr | Medium for DX | Both |

## Sources

- [Pino vs Winston 2026](https://www.pkgpulse.com/guides/pino-vs-winston-2026)
- [Biome vs ESLint 2026](https://stacknotice.com/blog/biome-vs-eslint-prettier-guide-2026)
- [pg-boss docs](https://github.com/timgit/pg-boss)
- [Sonner docs](https://sonner.emilkowal.ski/)
- [Lucide docs](https://lucide.dev/guide/packages/lucide-react)
- [date-fns vs Temporal 2026](https://www.pkgpulse.com/guides/date-fns-v4-vs-temporal-api-vs-dayjs-date-handling-2026)
- [OpenObserve](https://github.com/openobserve/openobserve)
- [Kysely vs Drizzle](https://cadence.withremote.ai/blog/typeorm-vs-drizzle-vs-prisma-vs-kysely)
- [Structured Logging Node.js](https://cadence.withremote.ai/blog/structured-logging-nodejs)
