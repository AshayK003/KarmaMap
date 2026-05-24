# KarmaMap Testing Strategy

## Test Stack (All Free / OSS)

| Layer | Tool | Why |
|-------|------|-----|
| Unit / Integration | **Vitest** | Same as Vite tooling, fast, ESM-native, already compatible with TS 6 |
| API / E2E | **Supertest** (backend) | HTTP assertions without running a real server |
| Component | **Vitest + happy-dom** | Lightweight DOM, no browser needed for logic checks |
| Coverage | **c8** (built into Vitest) | Zero-config, Istanbul under the hood |
| CI | **GitHub Actions** | Free tier, runs vitest natively |

**Rationale**: Vitest over Jest because the project already uses Vite + TS 6. Vitest shares Vite's transform pipeline — no duplicate config. No Playwright/Cypress: the SPA is simple enough that Supertest + API tests catch the real bugs.

---

## Test Pyramid

```
         ╱  ╲
        ╱ E2E ╲               ← 3 critical user flows (API only, no browser)
       ╱────────╲
      ╱Integration╲           ← 8 route-level tests (Supertest)
     ╱──────────────╲
    ╱   Service/Unit   ╲      ← 25 unit tests (pure logic, fast)
   ╱────────────────────╲
  ╱  Utility/Helper/Model ╲   ← 15 tests for geo, format, schema, types
 ╱──────────────────────────╲
```

**Target**: ~50 tests total, runs in <10s, 0 external dependencies (mock Supabase).

---

## Highest-Value Test Cases

### Tier 1 — Unit Tests (Pure Logic, No Mocks Required)

These are **pure functions** — fastest to write, highest ROI, catch real bugs.

| # | File | Function | Tests | What It Catches |
|---|------|----------|-------|-----------------|
| 1 | `backend/services/matchingService.ts` | `skillOverlap()` | Case sensitivity, empty required skills, partial overlap, no overlap | **Real bug**: empty required skills returns 1 (perfect score) — inflates matching for gigs with no skill req |
| 2 | same | `normalizeDistance()` | 0m, 25000m (half), 50000m (max), 100000m (clamped), negative | Ensures score is always [0,1] |
| 3 | `frontend/src/utils/geo.ts` | `skillOverlapScore()` | Same logic as backend but returns percentage 0–100 | Inconsistency if frontend/backend diverge |
| 4 | same | `parseGigLocation()` | GeoJSON `{type, coordinates}`, EWKT `SRID=4326;POINT(lng lat)`, `POINT(lng lat)`, null, malformed | Map crashes on bad data |
| 5 | same | `calculateHaversineDistance()` | Same point, Delhi–Mumbai, antipodal | Map distance calculation |
| 6 | same | `formatDistance()` | 500m, 1500m, 0m | Display formatting |
| 7 | same | `estimateTravelTime()` | 500m (walk), 5000m (drive), 0m | Travel time display |
| 8 | same | `generatePortfolioSlug()` | Simple name, spaces, special chars | URL generation |
| 9 | `frontend/src/utils/gigStatus.ts` | `GIG_STATUS_LABELS` | All 4 status values | Missing status display |
| 10 | `frontend/src/services/geocoding.ts` | `formatPhotonLabel()` | Dedup parts, missing parts, empty | Place search display |

**Edge cases to include**:
- `skillOverlap([], ['a','b'])` → `1` (bug if you expect 0)
- `skillOverlap(['A'], ['a'])` → `1` (case insensitive — verify)
- `normalizeDistance(-100)` → `1` (clamped)
- `parseGigLocation(null)` → `null`
- `parseGigLocation({type:'Point',coordinates:[77,28]})` → `{lng:77,lat:28}`
- `parseGigLocation('POINT(77.2 28.6)')` → `{lng:77.2,lat:28.6}`
- `parseGigLocation('SRID=4326;POINT(77.2 28.6)')` → `{lng:77.2,lat:28.6}`
- `generatePortfolioSlug('John Doe')` → `john-doe-<timestamp>`

### Tier 2 — Service Unit Tests (Mock Supabase)

Test business logic in services. Mock `supabaseAdmin` to control DB responses.

| # | File | Function | Key Cases |
|---|------|----------|-----------|
| 11 | `gigService.ts` | `verifyGigOwnership()` | Own gig (returns gig), not own gig (throws 403), gig not found (throws 403) |
| 12 | same | `getGigOwnership()` | Gig exists, gig missing (`.single()` returns null) |
| 13 | same | `createGig()` | **Matching fails gracefully** → still returns `{gig, matched_count: 0}` |
| 14 | `participationService.ts` | `joinGig()` | Fresh join, duplicate (first check), duplicate (23505 race), gig full |
| 15 | same | `completeParticipation()` | Valid completion, wrong volunteer (403), missing hours, missing participation |
| 16 | same | `awardKarma()` | RPC succeeds (returns karma), RPC fails → fallback atomic update, fallback concurrent update (race) |
| 17 | `matchingService.ts` | `findMatchedVolunteers()` | Gig not found, RPC succeeds, RPC fails → fallback 1, all fallbacks fail, empty results |
| 18 | same | `notifyMatchedVolunteers()` | 0 volunteers (no-op), 5 volunteers (batch insert), insert error (logged) |
| 19 | `emailService.ts` | `sendEmail()` | All env vars present (mock fetch 200), env vars missing (returns false), fetch fails (returns false) |

**Bugs these tests catch**:
- `createGig`: if matching throws, gig is still created (confirmed: wrapped in try/catch but `res.status(201).json(gig)` never executes if matching throws before return — **actual bug** in `gigController._createGig`: it calls `await createGigService(...)` which itself catches matching errors, so it's fine, but the controller doesn't handle the service throwing).
- `awardKarma`: read-then-write fallback has race condition — two concurrent completions can overwrite each other's streaks.

### Tier 3 — API / Integration Tests (Supertest + Mock Supabase)

Test the full Express request → response cycle. Mock supabase at the client level.

| # | Route | Auth | Cases |
|---|-------|------|-------|
| 20 | `POST /api/gigs` | JWT + ngo | Valid body → 201, missing title → 400, volunteers_needed=0 → 400, no auth → 401, volunteer role → 403 |
| 21 | `GET /api/gigs/analytics` | JWT + ngo | Has gigs → 200 with chart_data, no gigs → 200, no auth → 401 |
| 22 | `POST /api/gigs/:gid/match` | JWT + ngo | Own gig → 200, not own → 403, invalid UUID → 400 |
| 23 | `PATCH /api/gigs/:gid/feature` | JWT + ngo | Valid hours → 200, hours=0 → 400, not own → **currently returns 500 (bug)** |
| 24 | `POST /api/participations/join/:gid` | JWT + volunteer | Fresh → 201, duplicate → 409, no auth → 401, ngo role → 403 |
| 25 | `PATCH /api/participations/:pid/complete` | JWT + volunteer | Valid body → 200, hours <0.5 → 400, hours >24 → 400, wrong volunteer → 403 |
| 26 | `GET /health` | none | Returns `{status:'ok', service:'karmamap-api'}` |

**Bug confirmed**: `PATCH /api/gigs/:gid/feature` with unauthorized user throws 500 instead of 403. The `verifyGigOwnership` throws `{statusCode: 403}` but `asyncHandler` passes it to global error handler which returns 500. **This is the highest-priority bug to fix and test.**

### Tier 4 — Critical User Flows (E2E via API)

Test complete workflows across multiple endpoints.

| # | Flow | Steps | Validates |
|---|------|-------|-----------|
| 27 | **NGO creates gig → matching triggers** | POST /api/gigs → verify gig exists → check match_volunteers_for_gig was called | End-to-end gig creation pipeline |
| 28 | **Volunteer joins → completes → karma awarded** | POST join → PATCH complete → verify karma_points increased on profile | Full participation lifecycle |
| 29 | **Duplicate join prevented** | POST join → POST join → second returns 409 | Race condition guard |

### Tier 5 — Component Tests (Frontend, Minimal)

Only for components with non-trivial logic.

| # | Component | Tests |
|---|-----------|-------|
| 30 | `ProtectedRoute` | Authenticated → renders children, unauthenticated → redirects to /login, wrong role → redirects |
| 31 | `GigCard` | Renders title, skills, distance; missing optional fields don't crash |
| 32 | `NotificationBell` | Unread count badge, dropdown render, empty state |
| 33 | `PhotoUpload` | File selected → preview shown, upload in progress → spinner, error → error message |

---

## Missing Coverage Areas (Gaps)

### ❌ Backend

| Gap | Risk | Mitigation |
|-----|------|------------|
| **No UUID validation on route params** | Invalid UUID crashes Supabase query | Add Zod `uuid()` param validation |
| **`req.user!.id` non-null assertion** | If `verifyJwt` fails silently, `TypeError` with 500 | Add early return check in middleware |
| **`_featureGig` throws 500 instead of 403** | Auth bypass info leak (different error messages) | Fix global handler to check `statusCode` |
| **`get_gig_location` RPC result unused** | Dead code path, confusing | Remove or use it |
| **`sendEmailOrThrow` dead export** | Dead code, misleading | Remove it |
| **Analytics retrieves ALL participations** | Scale issue with 10k+ participations | Add pagination or aggregation |
| **No request body size limit** | DoS via large JSON payloads | Add `express.json({limit:'1mb'})` |

### ❌ Frontend

| Gap | Risk | Mitigation |
|-----|------|------------|
| **No API retry logic** | Transient network failures kill UX | Add retry with backoff to `apiFetch` |
| **`joinGigViaApi` doesn't validate response** | 500 with non-JSON body crashes | Check `res.ok` before `.json()` |
| **Image compression is sync on main thread** | Large images freeze UI | Move to Web Worker or chunk |

---

## Flaky Test Risks

| Risk | Why | How to Avoid |
|------|-----|--------------|
| **Supabase realtime subscription tests** | Depends on WebSocket connection | Mock the Supabase client; never test realtime in unit tests |
| **Geolocation API tests** | Browser API, requires mock | Vitest + `vi.spyOn(navigator, 'geolocation')` |
| **Photon geocoding tests** | External API, rate-limited, network-dependent | Mock `fetch` at integration level; add 1 smoke test in CI only |
| **EmailJS tests** | External API, no test mode | Mock `fetch`; `sendEmail` is pure logic anyway |
| **Date-dependent logic** | `featured_until` with `NOW()` | Use `vi.setSystemTime()` to freeze clock |

**Golden rule**: Every test must pass offline, without network, without a Supabase project. The only exception: the 1–2 smoke tests in the CI workflow that hit a real Supabase project.

---

## Error Paths to Cover

| Scenario | Expected | Component |
|----------|----------|-----------|
| Invalid JWT (tampered token) | 401 | auth middleware |
| Expired JWT | 401 | auth middleware |
| Missing profile (user exists, no profile row) | `req.user.role` = undefined → 403 | auth middleware |
| Supabase network timeout in auth | 401 (caught) | auth middleware |
| Gig not found in `findMatchedVolunteers` | throws "Gig not found" | matchingService |
| Participation update for wrong volunteer | `.eq('volunteer_id', ...)` → 0 rows → throws | participationService |
| Analytics with 0 gigs | `chart_data` = [] | gigService |
| EmailJS fetch hangs (timeout) | Add timeout to fetch call | emailService |
| `canvas.toBlob` fails (mobile Safari) | throws "Canvas toBlob failed" | storage.ts |
| Photo upload to full bucket | throws storage error | storage.ts |

---

## Tests to Add First (Ordered by Impact)

### Sprint 1: Unit Tests (Day 1–2, 17 files)

```bash
npm init -y
npm install -D vitest
```

Files to create:
```
backend/src/__tests__/
  matchingService.test.ts    # skillOverlap, normalizeDistance (10 tests)
  emailService.test.ts       # sendEmail logic (3 tests)
frontend/src/__tests__/
  geo.test.ts                # all geo.ts functions (12 tests)
  gigStatus.test.ts          # status labels (4 tests)
  geocoding.test.ts          # formatPhotonLabel (3 tests)
```

**32 tests, runs in <1s, zero mocks.**

### Sprint 2: Service Tests (Day 3–4, 5 files)

```
backend/src/__tests__/
  gigService.test.ts         # verifyGigOwnership, createGig (5 tests)
  participationService.test.ts # joinGig, completeParticipation, awardKarma (8 tests)
```

Mock strategy:
```typescript
import { vi } from 'vitest';
vi.mock('../services/supabase.js', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      rpc: vi.fn(),
    })),
  },
}));
```

**13 tests, <2s.**

### Sprint 3: API Tests (Day 5–6, 8 Supertest files)

```
backend/src/__tests__/
  api.test.ts          # All 7 routes + health (20 tests)
  auth.test.ts         # verifyJwt, requireRole (3 tests)
  validate.test.ts     # validateBody (2 tests)
```

Import Express app without listening:
```typescript
import { createApp } from '../index.js'; // need to export app factory
import supertest from 'supertest';
```

**25 tests, <3s.**

### Sprint 4: Fix the 403→500 Bug + The Bug in gigController

```typescript
// Fix global error handler to respect statusCode on error objects
// This is the #1 actionable finding from this audit.
```

### Sprint 5: Component Tests (Day 7, 4 files)

```
frontend/src/__tests__/
  ProtectedRoute.test.tsx
  GigCard.test.tsx
  NotificationBell.test.tsx
  PhotoUpload.test.tsx
```

---

## Test Configuration

### `backend/vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/__tests__/**', 'src/index.ts'],
    },
  },
});
```

### `frontend/vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['src/__tests__/setup.ts'],
  },
});
```

### CI Job

```yaml
test:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with: { node-version: 22 }
    - run: cd backend && npm ci && npx vitest run
    - run: cd frontend && npm ci && npx vitest run
```

---

## Summary

| Metric | Target |
|--------|--------|
| Total tests | ~50 |
| Run time | <10s combined |
| External dependencies | 0 (all mocked) |
| Bugs confirmed by audit | 3 (403→500, dead code, unused RPC result) |
| Flaky test risk | Low (no network, no timers, no real DB) |
| Maintenance cost | Low (pure functions + mock Supabase = stable) |
