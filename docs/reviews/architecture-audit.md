# Architecture Simplicity Audit

**Date:** 2026-05-25
**Scope:** Full-stack review for overengineering, unnecessary abstraction, duplicated patterns, weak boundaries, and premature complexity.

---

## Summary

| Severity | Count | Top Items |
|---|---|---|
| **HIGH** | 7 | 3-tier matching fallback, duplicate realtime subscriptions, `pg-boss` queue without consumer, stale monitoring stack, hidden coupling in API layer, oversized components, dead RPC wrapper |
| **MEDIUM** | 8 | Pattern duplication across files, inconsistent service boundaries, unexported dead code, state storage strategy split, mixed API patterns on frontend |
| **LOW** | 6 | Minor duplication, cosmetic inconsistencies, trace-level coupling |

---

## 1. Unnecessary Abstractions

### HIGH: `match_volunteers_for_gig` RPC is a useless wrapper

**File:** `supabase/migrations/01_functions_and_realtime.sql:81-104`

This RPC does ONE thing: calls `nearby_volunteers_for_gig(p_gig_id, p_radius_meters)` and adds an always-empty `email TEXT` column to the result. It adds no query logic, no filtering, no transformation.

```sql
SELECT nv.id, nv.name, ''::TEXT AS email, nv.skills, nv.distance_meters
FROM public.nearby_volunteers_for_gig(p_gig_id, p_radius_meters) nv;
```

**Impact:** One extra function to maintain, one extra entry in the function catalog, and the call chain becomes `backend → RPC wrapper → inner RPC → DB` instead of `backend → inner RPC → DB`.

**Fix:** Delete `match_volunteers_for_gig`. Update `matchingService.ts` to call `nearby_volunteers_for_gig` directly.

---

### HIGH: `pg-boss` job queue adds complexity for zero benefit

**Files:** `backend/services/queue.ts`, `backend/index.ts:77`

The queue infrastructure is:
- A `PgBoss` instance (if `DATABASE_URL` is set)
- An `enqueueMatching` function that returns `false` if the queue is unavailable
- A `startWorker` that processes matching jobs
- Worker handler duplicates the matching logic already in `gigService.createGig`
- Dynamic import fallback to run matching synchronously when queue is off

The current deployment does NOT set `DATABASE_URL`. The queue is **never activated**. Every single matching call goes through the synchronous fallback path, which uses **dynamic imports** (`await import('./matchingService.js')`) — an awkward pattern that breaks static analysis.

**What it adds:** 55 lines of infrastructure code + error-prone dynamic imports + one extra failure mode (startup promise not caught)

**What synchronous path already handles:** Everything. The matching + notification + email pipeline works without the queue.

**Fix:** Remove `pg-boss` entirely. Remove `queue.ts`. Remove the dynamic import fallback from `gigService.ts`. Import `matchingService` and `emailService` statically, call them directly. If job queuing is ever needed, `pg-boss` can be reintroduced cleanly — the current "conditional" approach is the worst of both worlds (loaded but unused).

**Regression risk:** Low. Migration is mechanical: replace `enqueueMatching` call with direct `findMatchedVolunteers` + `notifyMatchedVolunteers` + `sendGigMatchEmails` calls.

---

### MEDIUM: In-memory cache with no eviction strategy

**File:** `backend/src/lib/cache.ts` (25 lines)

The cache is a `Map<string, { data: unknown; expires: number }>` with:
- No maximum size
- No LRU eviction
- No time-based sweep
- The `clearCache` function is defined but not exported (dead code)
- Single consumer: `getNgoAnalytics()` with 30-second TTL

**Assessment:** For a single analytics endpoint with one active NGO user, this cache is overengineered. The cache layer adds code surface (25 lines + call site) for what amounts to "don't query the database twice within 30 seconds." For a system at current scale, a direct query on each analytics fetch is simpler and eliminates the OOM risk from unbounded Map growth.

**Fix:** Remove the cache abstraction. Have `getNgoAnalytics` query Supabase directly on each call. If caching is later needed, use a proven external cache (Redis, or Supabase's own query cache) rather than a hand-rolled in-memory Map.

---

## 2. Duplicated Patterns

### HIGH: Matching pipeline logic in 3 places

The sequence `findMatchedVolunteers → notifyMatchedVolunteers → sendGigMatchEmails` appears in:

| Location | Line(s) | Context |
|---|---|---|
| `gigService.ts` | 92-96 | Called from `createGig` when queue is unavailable |
| `queue.ts` | 44-49 | Worker handler processes matching job |
| `gigController.ts` | 104-106 | `triggerMatching` handler calls services directly |

Three copies of the same orchestration logic. If the matching pipeline changes (e.g., add a step), all three must be updated.

**Fix:** Extract the pipeline into a single function in `gigService.ts`. Remove `queue.ts`. Remove the controller's direct call — make it delegate to the service.

---

### HIGH: Duplicate realtime subscription for `gigs` table

| Location | Lines | Mechanism |
|---|---|---|
| `hooks/useRealtimeGigs.ts` | 37-86 | Full channel subscription with INSERT/UPDATE/DELETE handlers + profile enrichment |
| `pages/VolunteerMap.tsx` | 101-154 | Separate channel subscription with debounced refetch |

Two components subscribe to the same `gigs` table changes with **different handling strategies**:
- The hook does incremental updates (inserts new gig, updates in-place, removes deleted)
- The page does a full debounced refetch (forces re-render of entire gig list + map)

When a new gig is inserted, both fire. The page refetch duplicates the work the hook already did. The debounce is an attempt to batch these but adds 500ms latency.

**Fix:** Remove the inline subscription from `VolunteerMap.tsx`. Have it consume `useRealtimeGigs` instead. The debounced refetch was likely added because the incremental approach had a bug (missing profile enrichment?) — fix that instead of working around it.

---

### HIGH: `parseGigLocation` in 3 independent implementations

| File | Lines | Implementation |
|---|---|---|
| `utils/geo.ts` | 33-57 | Exported function, handles both GeoJSON and EWKT |
| `GigDetail.tsx` | 124-126 | Inline `match` on string patterns |
| `VolunteerPortfolio.tsx` | 178, 186 | Inline regex `point\(([^ ]+) +([^ )]+)\)` |

Three different implementations that parse the same data format. The `geo.ts` version should be the single source of truth.

**Fix:** Use `parseGigLocation` from `geo.ts` in all call sites. Remove inline implementations.

---

### MEDIUM: `getKarmaLevel` in 2 files

| File | Lines |
|---|---|
| `pages/PublicPortfolio.tsx` | 76-80 |
| `pages/VolunteerPortfolio.tsx` | 201-206 |

Identical function. Should live in a shared utility.

---

### MEDIUM: `skillOverlap` duplicated backend ↔ frontend

| File | Function |
|---|---|
| `backend/services/matchingService.ts` | `skillOverlap(required, volunteer)` |
| `frontend/src/utils/geo.ts` | `skillOverlapScore(required, volunteer)` |

Same algorithm, different file, different name, different casing. Algorithm must be kept in sync manually.

**Fix acceptable as-is:** The backend version scores for matching; the frontend version scores for display sorting. They serve different tiers. Document the coupling. If the algorithm changes, both must change.

---

## 3. Weak Boundaries

### HIGH: Controllers calling `supabaseAdmin` directly

**File:** `backend/controllers/gigController.ts:83-91`

`_featureGig` bypasses the service layer entirely:

```ts
const { error } = await supabaseAdmin
  .from('gigs')
  .update({ featured_until })
  .eq('id', gigId)
```

**Why this is a problem:** The service layer exists for a reason — it encapsulates database operations, validates ownership, and provides a single point for cross-cutting concerns (logging, metrics). By calling `supabaseAdmin` directly, `_featureGig`:
- Duplicates the `verifyGigOwnership` call pattern (but uses its own inline query)
- Makes it impossible to add logging or metrics to all DB operations in one place
- Creates an inconsistent pattern where future developers won't know when to use the service vs. direct calls

**Fix:** Move the `featureGig` logic into `gigService.ts`. Wrap `verifyGigOwnership` and the update in a single exported function. Have the controller call it.

**Same pattern in `triggerMatching`** (lines 104-106) — calls `findMatchedVolunteers`, `notifyMatchedVolunteers`, and `sendGigMatchEmails` directly instead of going through `gigService`.

---

### HIGH: Module-level mutable state in `api.ts`

**File:** `frontend/src/utils/api.ts:11-15`

```ts
let cachedToken: string | null = null;
supabase.auth.onAuthStateChange((_event, session) => {
  cachedToken = session?.access_token ?? null;
});
```

This state:
- Lives outside React's lifecycle (no cleanup, no tear-down)
- Is set at module import time (before any component mounts)
- Creates a hidden coupling between `api.ts` and the Supabase auth module
- Can race: if token changes between `cachedToken` read and the `fetch` call, a stale token is used

**Fix:** Have `apiFetch` accept the token as a parameter, or read it from a React context. The subscription should live inside a component or be tear-down-able.

---

### MEDIUM: Redundant try-catch in controller defeats `asyncHandler`

**File:** `backend/controllers/participationController.ts:35-41`

```ts
try {
  const participation = await joinGigService(gigId, req.user!.id);
  res.status(201).json({ participation });
} catch (err: any) {
  const statusCode = err.statusCode ?? 400;
  res.status(statusCode).json({ error: err.message });
}
```

The controller is wrapped in `asyncHandler` which catches errors and passes them to the global error handler. But this manual try-catch catches errors first, sends a response, and does NOT return — if the catch block itself throws, both `asyncHandler` and the try-catch will try to respond. Duplicate error handling paths.

**Fix:** Remove the try-catch. Let `asyncHandler` + global error handler manage all errors. If specific HTTP status codes are needed, throw a typed error (e.g., `AppError` with `statusCode`) instead of handling in the controller.

---

### MEDIUM: `supabase.ts` calls `dotenv.config()` redundantly

**File:** `backend/services/supabase.ts:2,8`

`dotenv.config()` is already called in `index.ts:12`. The call in `supabase.ts` works only because `dotenv.config()` is idempotent, but it creates a hidden dependency on module import order.

**Fix:** Remove `dotenv.config()` from `supabase.ts`. Add a guard: throw if required env vars are missing at module init time, with a clear error message.

---

## 4. Oversized Components (Excessive Responsibility)

### HIGH: `VolunteerPortfolio.tsx` — 624 lines

**File:** `frontend/src/pages/VolunteerPortfolio.tsx`

Single component handling:
- Profile display
- Bio editing (inline edit + save)
- Skills editing (inline edit + add/remove)
- Completed gigs listing
- Eco-savings calculation and display
- Certificate generation
- Share URL functionality (navigator.share + clipboard)
- Portfolio slug management
- Karma level calculation

**Fix:** Extract into sub-components:
- `PortfolioHeader` (avatar, name, karma, streak, badge)
- `PortfolioBio` (bio display + inline editor)
- `PortfolioSkills` (skills display + inline editor)
- `CompletedGigsList` (gig history with certificates)
- `EcoSavings` (carbon offset display)
- `SharePortfolio` (share URL + copy)

---

### Previously: `NgoGigCard.tsx` — 413 lines (inline editor removed)

The inline edit feature (title, description, skills, location, date editing) was removed entirely. The component now handles:
- Gig status display with color themes
- Volunteer progress bar
- Location display
- Status transitions (open → in_progress → completed)
- Feature gig button

---

## 5. Premature Scalability Patterns

### HIGH: Prometheus + Loki + Grafana stack without instrumentation

**Files:** `docker-compose.monitoring.yml`, `prometheus.yml`, `loki.yml`

A full observability stack is deployed and configured — Prometheus scraping, Loki log aggregation, Grafana dashboards — but:
- The backend has **no `/metrics` endpoint** (prom-client not installed)
- There is **no structured log shipping** to Loki
- Grafana is fully configured but has **no datasources or dashboards provisioned**
- The stack adds 3 containers to the deployment

**Assessment:** This is observability infrastructure bought before the instrumentation was written. For current scale, `docker logs` + `pino` JSON logs are sufficient. The monitoring stack adds operational complexity (volume management, config maintenance, resource usage) without providing value.

**Fix:** Either:
1. Remove the monitoring stack until a `/metrics` endpoint is implemented, OR
2. Implement the `/metrics` endpoint with prom-client and provision basic Grafana dashboards

Current state is pay-all-cost, get-no-benefit.

---

### MEDIUM: `render.yaml` references a non-existent deployment path

**File:** `render.yaml` (22 lines)

This file configures a Render.com deployment, but the CI/CD pipeline uses GHCR + docker-compose + SSH deploy. Render is not in use. The file is stale configuration that wastes 22 lines and confuses future readers.

**Fix:** Remove `render.yaml` or clearly document it as an alternate/legacy deployment target.

---

### LOW: Separate `docker-compose.monitoring.yml`

**File:** `docker-compose.monitoring.yml`

Actually this is fine — separate compose file for optional monitoring means the core app doesn't depend on it. This is the right pattern. Not overengineering, just premature (see above).

---

## 6. Inconsistent Conventions

### MEDIUM: Mixed API consumption pattern on frontend

The frontend reads data two ways:

**Pattern A — Supabase anon client (direct):**
```ts
const { data } = await supabase.from('gigs').select('*').eq('id', id)
```
Used in: `GigDetail.tsx`, `VolunteerPortfolio.tsx`, `Leaderboard.tsx`, `Home.tsx`

**Pattern B — REST API via Express:**
```ts
const data = await apiFetch<Response>(`/api/gigs/analytics`)
```
Used in: `NgoDashboard.tsx`, `CreateGig.tsx` (POST), `ParticipateGig.tsx` (POST/PATCH)

**Problem:** This is inconsistent. Some mutations go through the backend (gig creation, participation), others go directly to Supabase (updating gig status, reading data). The developer has to know which path to use for which operation. Error handling differs between paths.

**Root cause:** Supabase RLS policies allow certain reads directly (gig listing, profiles), but writes that trigger side effects (matching, email, karma award) must go through the backend with service_role access.

**Fix acceptable as-is:** Document the rule clearly: reads go through anon client, writes with side effects go through REST. But consider consolidating all writes through the backend for consistency.

---

### MEDIUM: `components.json` declares lucide-react but only 1 of 12 icon-using files imports it

**File:** `frontend/components.json` (shadcn config)

The project setup chose lucide-react as the icon library, but:
- 97+ inline SVGs across 12 files
- Only `Navbar.tsx` imports from lucide-react
- Every other file uses raw `<svg>` elements

This means icon style varies across the app, accessibility differs, and the chosen library is underutilized.

---

## 7. Hidden Coupling

### HIGH: `utils/api.ts` tightly coupled to Supabase auth lifecycle

**File:** `frontend/src/utils/api.ts`

```ts
let cachedToken: string | null = null;
supabase.auth.onAuthStateChange((_event, session) => {
  cachedToken = session?.access_token ?? null;
});
```

The `apiFetch` utility is coupled to:
1. The Supabase client module (imported at the top)
2. Module-level state that lives outside React
3. The auth state change event lifecycle

If the auth provider changes (e.g., from Supabase Auth to a custom provider), `api.ts` must be rewritten.

---

### MEDIUM: `AuthContext.tsx` imports from both `lib/supabase.ts` and `utils/api.ts`

**Files:** `frontend/src/context/AuthContext.tsx`

The auth context imports `supabase` for auth operations AND `apiFetch` for profile updates. This means:
- `AuthContext` depends on two different API layers
- Profile updates use REST API while auth uses Supabase directly
- If the API layer changes (e.g., migrate to tRPC), `AuthContext` needs changes in two places

---

### LOW: `Login.tsx` dynamically imports `supabase` inside event handler

**File:** `frontend/src/pages/Login.tsx:36-42`

```ts
const { data: session } = await import('../lib/supabase').then((m) => m.supabase.auth.getSession());
```

This is a dynamic import of a module that is ALREADY loaded at the top of `AuthContext.tsx`. This works but signals uncertainty about module availability. If the import path changes, this breaks silently.

---

## 8. Dead Code

### HIGH: `cache.ts` — `clearCache` defined but not exported

**File:** `backend/src/lib/cache.ts:17-22`

```ts
function clearCache(pattern?: string): void {
  if (!pattern) { store.clear(); return; }
  for (const key of store.keys()) {
    if (key.includes(pattern)) store.delete(key);
  }
}
```

Defined, never exported, never called. Entirely unreachable dead code.

---

### MEDIUM: `matchingService.ts` — dead `gigData` query in fallback

**File:** `backend/services/matchingService.ts:85-89`

```ts
const { data: gigData } = await supabaseAdmin
  .from('gigs')
  .select('ngo_id')
  .eq('id', gigId)
  .single();
```

`gigData` is fetched but never used anywhere in the function. This is a wasted database query on every execution of the fallback path.

---

### MEDIUM: `get_ngo_analytics` computes `ARRAY_AGG(id)` but discards it

**File:** `supabase/migrations/04_analytics_optimization.sql:11-15`

```sql
ARRAY_AGG(id) AS gig_ids
```

The `gig_ids` array is computed but never included in the final JSON return. Wasted CPU on every analytics fetch.

---

### LOW: `skillOverlap` export in `matchingService.ts`

```ts
export function skillOverlap(...)
```

Exported but only used internally within `matchingService.ts` and in tests. If no external file imports it, the `export` is unnecessary.

---

## 9. Excessive Component Splitting

**Verdict:** The component split is **reasonable**. The project has:
- 11 pages (one per route — correct)
- 12 custom components (MapView, LocationPicker, PlaceSearch, GigCard, NgoGigCard, etc.)
- 9 shadcn/ui primitives
- 5 hooks (3 of which are in one file)

The split follows feature boundaries. No component is split too aggressively. The issue is the OPPOSITE (some components are too large — see section 4).

---

## 10. Fix Priority Matrix

| Priority | Fix | Impact | Effort | Files Affected |
|---|---|---|---|---|
| **HIGH** | Remove `pg-boss` entirely, inline matching pipeline | Eliminates queue complexity, dynamic imports, uncaught promise | Medium | `queue.ts`, `index.ts`, `gigService.ts`, `gigController.ts` |
| **HIGH** | Remove duplicate realtime subscription in `VolunteerMap.tsx` | Stops duplicate DB subscriptions, reduces re-renders | Small | `VolunteerMap.tsx` |
| **HIGH** | Consolidate `parseGigLocation` to single source | Removes 3 independent implementations | Small | `geo.ts`, `GigDetail.tsx`, `VolunteerPortfolio.tsx` |
| **HIGH** | Move `_featureGig` and `triggerMatching` into service layer | Consistent service boundaries | Small | `gigController.ts`, `gigService.ts` |
| **HIGH** | Fix `api.ts` token management | Eliminates module-level mutable state race condition | Small | `api.ts`, `AuthContext.tsx` |
| **MEDIUM** | Remove in-memory cache, query directly | Eliminates OOM risk, dead code | Small | `cache.ts`, `gigService.ts` |
| **MEDIUM** | Remove or instrument monitoring stack | Eliminates infra without benefit | Small | All monitoring files |
| **MEDIUM** | Consolidate `getKarmaLevel` into shared utility | Removes duplication | Small | Both portfolio files + new utility |
| **MEDIUM** | Remove `match_volunteers_for_gig` RPC, use inner RPC directly | Simplifies call chain | Small | Migration file + `matchingService.ts` |
| **MEDIUM** | Remove try-catch from `_joinGig`, let `asyncHandler` handle | Fixes double-response risk | Tiny | `participationController.ts` |
| **MEDIUM** | Standardize API consumption pattern (document or consolidate) | Developer clarity | Medium | All frontend files |
| **LOW** | Remove `render.yaml` | Cleans stale config | Tiny | `render.yaml` |
| **LOW** | Extract `VolunteerPortfolio` sub-components | Improves maintainability | Large | `VolunteerPortfolio.tsx` |
| **DONE** | Remove `NgoGigCard` inline editor (feature removed) | Cleans up tech debt | — | `NgoGigCard.tsx` |
| **LOW** | Migrate inline SVGs to `lucide-react` | Consistency | Large | 12 files |

---

## 11. What's NOT Overengineered (preserve)

| Pattern | Why it's justified |
|---|---|
| Route → Controller → Service → DB | Standard Express pattern, clear separation of concerns |
| 5 hooks (3 in one file) | Each hook maps to a distinct concern (geolocation, location picking, realtime data) |
| 11 pages for 11 routes | Each page is a distinct feature |
| 12 custom components | Each has a clear UI responsibility |
| shadcn/ui primitives | 9 small components, each ~20 lines, standard pattern |
| Zod validation middleware | Consistent validation boundary, tested pattern |
| `asyncHandler` wrapper | 3 lines that eliminate try-catch boilerplate on every route |
| `pino` structured logging | Provides log levels, JSON output, secret redaction |
| Multi-stage Dockerfiles | Standard best practice, no complexity tax |
| Separate `docker-compose.monitoring.yml` | Optional infra, doesn't affect core deployment |
