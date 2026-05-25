# Test Strategy

**Date:** 2026-05-25
**Supersedes:** `docs/testing-strategy.md` (previous version was 327 lines of detailed plans — this is the practical refinement)
**Principle:** Test business-critical paths. Don't test implementation details. Don't test libraries.

---

## Priority Matrix

Tests are ranked by: business value × risk of regression × execution speed.

| Priority | Area | Why | Est. Tests |
|---|---|---|---|
| **P0** | Fix existing misleading tests | `participationService.test.ts` tests a fallback that doesn't exist | 1 fix |
| **P0** | API contract tests (all endpoints) | Catches regressions in request/response shapes, auth enforcement, status codes | 12 |
| **P0** | Auth middleware (JWT verify, role enforce) | Security-critical; every endpoint depends on it | 6 |
| **P1** | Service: matching algorithm | Core business logic: proximity + skill scoring | 8 |
| **P1** | Service: karma award atomicity | Financial-style correctness — karma is the sole incentive | 4 |
| **P1** | Form validation (Zod schemas) | Catches schema drift between frontend and backend | 6 |
| **P2** | Frontend: critical UI interactions | Join flow, create gig flow, ProtectedRoute guard | 4 |
| **P2** | Frontend: pure utility functions | `parseGigLocation`, haversine, etc. | 8 |
| **P3** | Edge cases (empty states, error paths) | Improves resilience | 6 |
| **—** | shadcn/ui components | Library code — **do not test** | 0 |
| **—** | Recharts rendering | Library code — **do not test** | 0 |
| **—** | Inline SVG icons | Presentation — **do not test** | 0 |
| **—** | CSS classes / animation | Presentation — **do not test** | 0 |
| **—** | Loading spinner visibility | Implementation detail — **do not test** | 0 |

**Target: ~50 tests, <10s runtime, 0 external dependencies (all mocked).**

---

## P0 — Fix Existing Misleading Tests

### `participationService.test.ts` — line 84

**Problem:** The test "falls back to read-then-write when RPC fails" mocks a manual `select`/`update` fallback. The actual `awardKarma` code does NOT have this fallback — it only retries the RPC once and throws on second failure.

**Action:** Either implement the read-then-write fallback in the service, or change the test to match the real retry-once-then-throw behavior.

**This is the single most important testing fix.** A test that passes against mocked code but would fail against the real implementation is worse than no test — it creates false confidence.

---

## P0 — API Contract Tests

Test every Express endpoint for: correct status code, correct response shape, auth enforcement.

| Endpoint | Cases |
|---|---|
| `GET /health` | Returns `{ status: 'ok' }` — 200 |
| `POST /api/gigs` | Valid NGO (201), missing title (400), volunteer role (403), no auth (401) |
| `GET /api/gigs/analytics` | Has data (200), no data (200), wrong role (403) |
| `POST /api/gigs/:gigId/match` | Own gig (200), not own (403) |
| `PATCH /api/gigs/:gigId/feature` | Valid hours (200), hours=0 (400), **not own → 403 (currently 500 — bug)** |
| `POST /api/participations/join/:gigId` | Fresh (201), duplicate (409), volunteer role required (403) |
| `PATCH /api/participations/:pid/complete` | Valid (200), hours <0.5 (400), wrong volunteer (403) |

**Current bug confirmed in audit:** `PATCH /api/gigs/:gigId/feature` with unauthorized user returns 500 instead of 403. The `verifyGigOwnership` throws `{ statusCode: 403 }` but the global error handler doesn't respect `statusCode` on all error paths.

---

## P0 — Auth & Security Tests

| Test | What it catches |
|---|---|
| Invalid JWT (tampered token) → 401 | Auth bypass |
| Expired JWT → 401 | Session handling |
| Missing profile (user exists, no row in `profiles`) → `req.user.role` = undefined → 403 | Profile trigger failure |
| Volunteer role calls NGO endpoint → 403 | Role enforcement |
| NGO role calls volunteer endpoint → 403 | Role enforcement |
| No auth header → 401 | Missing middleware check |

**Do not test:** Supabase Auth internals (token refresh, cookie management). Those are library concerns. Test only the integration point where our code calls `supabaseAdmin.auth.getUser()` and uses the result.

---

## P1 — Service: Matching Algorithm

Test the scoring function in isolation — no mocks needed.

| Test | Input | Expected |
|---|---|---|
| Perfect skill match | `(['a','b'], ['a','b','c'])` | 1.0 (100%) |
| Partial overlap | `(['a','b'], ['a','c'])` | 0.5 (50%) |
| No overlap | `(['a','b'], ['c','d'])` | 0.0 (0%) |
| Empty required skills | `([], ['a','b'])` | 1.0 — **this is the current behavior. Is it intended?** |
| Case insensitive | `(['A'], ['a'])` | 1.0 |
| Proximity score: 0m | 0 | 1.0 |
| Proximity score: max distance | 50000 | 0.0 |
| Proximity score: clamped negative | -100 | 1.0 |
| Combined score: close + matching skills | varies | 0.5 × proximity + 0.5 × overlap |

**Edge case flag:** `skillOverlap([], ['a','b'])` returns 1.0. This means gigs with no skill requirements get a perfect match score for everyone. Confirm this is intentional.

---

## P1 — Service: Karma Award Atomicity

Test the `awardKarma` function — this is the only karma write path.

| Test | What it validates |
|---|---|
| RPC succeeds → karma_points += hours × 10 | Correct formula |
| RPC succeeds → streak += 1 | Streak increment |
| RPC fails once → retries once | Retry logic |
| RPC fails twice → throws with error message | Failure mode |
| Concurrent completions → no race (atomic RPC) | `award_karma` RPC should handle this |

**Note:** The streak is incremented unconditionally. It's NOT a date-based streak. Document this behavior in tests so it's clear when someone changes it.

---

## P1 — Form Validation (Zod Schemas)

Test the backend Zod schemas directly — no HTTP needed.

| Schema | Cases |
|---|---|
| `createGigSchema` | Title ≥3 chars, desc ≥10 chars, volunteers_needed 1-500, lat -90..90, lng -180..180, required_skills not empty |
| `featureGigSchema` | hours > 0 |
| `completeGigSchema` | hours 0.5-24, photos optional strings |

**Frontend schemas should mirror backend.** Test that frontend schemas accept the same valid data and reject the same invalid data. If they diverge, one side will accept data the other rejects.

---

## P2 — Frontend: Critical UI Interactions

Test user-facing behavior, not rendering.

| Component | Test | What it validates |
|---|---|---|
| `ProtectedRoute` | Unauthenticated user → redirects to `/login` | Auth gate works |
| `ProtectedRoute` | Wrong role → redirects to correct role's landing page | Role routing |
| `GigCard` | Title, NGO name, distance rendered | Data display |
| `GigCard` | Missing optional fields (no description) → no crash | Resilience to incomplete data |

**Do not test:**
- `MapView` — Leaflet integration. Too complex to mock, low value.
- `Navbar` — Pure presentational with auth conditional rendering. The AuthContext tests cover the logic.
- `Leaderboard` — Data fetching logic is a single Supabase query. Test the query contract at the API level instead.
- `NotificationBell` — Dropdown open/close is trivial. Test the `unreadCount` logic in the hook.

---

## P2 — Frontend: Pure Utility Functions

Already largely covered by `geo.test.ts` (130 lines). Fill gaps:

| Function | Gap |
|---|---|
| `parseGigLocation` | EWKT format `SRID=4326;POINT(lng lat)` coverage |
| `formatDistance` | 0m, large numbers |
| `estimateTravelTime` | Edge cases: 0m, very long distance |
| `generatePortfolioSlug` | Special characters, empty name |

---

## P3 — Edge Cases & Error Paths

| Scenario | Layer |
|---|---|
| Analytics with 0 gigs → `chart_data` = [] | Backend service |
| EmailJS env vars missing → graceful return false | Backend service |
| Matching RPC fails → fallback works | Backend service |
| Participation update for wrong volunteer → 403 | Backend service |
| Photo upload to full bucket → error message | Frontend service |
| Gig not found in `findMatchedVolunteers` → throws | Backend service |

---

## What NOT to Test (Explicit)

| Skip | Reason |
|---|---|
| shadcn/ui components (Button, Card, Input, Badge, etc.) | Library code, tested by maintainers |
| Recharts chart rendering | Library code |
| Leaflet / MapView interactions | Library integration, too costly to mock |
| Inline SVG icons | Pure presentation |
| CSS animations and transitions | Styling, not behavior |
| Loading spinners | Implementation detail |
| Console.error catch blocks | Error handling pattern — test the error path, not the log |
| Supabase Realtime subscription setup | Network-dependent, tested at integration level |
| Third-party API responses (OSRM, Photon, Open-Meteo) | External — mock at boundary |

---

## Current Test Health

| File | Status | Issue |
|---|---|---|
| `backend/src/__tests__/api.test.ts` | ✅ Exists | Covers most routes |
| `backend/middleware/__tests__/auth.test.ts` | ✅ NEW (10 tests) | JWT verify + requireRole — all security paths |
| `backend/src/__tests__/schemas.test.ts` | ✅ NEW (23 tests) | All 4 Zod schemas — valid/invalid/edge cases |
| `backend/services/__tests__/participationService.test.ts` | ✅ **FIXED** | Misleading fallback test replaced with retry-once pattern; joinGig duplicate fixed; success path added |
| `backend/services/__tests__/gigService.test.ts` | ✅ Exists | |
| `backend/services/__tests__/matchingService.test.ts` | ✅ **EXTENDED** (21 tests) | Now tests `findMatchedVolunteers` (gig not found, RPC success, RPC fallback, last resort, limit) + `notifyMatchedVolunteers` |
| `backend/services/__tests__/emailService.test.ts` | ✅ Exists | |
| `frontend/src/__tests__/geo.test.ts` | ✅ Exists | 24 tests, good coverage |
| `frontend/src/__tests__/apiFetch.test.ts` | ✅ **FIXED** (4 tests restored) | Mock was missing `onAuthStateChange` |
| `frontend/src/__tests__/geocoding.test.ts` | ✅ Exists | |
| `frontend/src/components/__tests__/ProtectedRoute.test.tsx` | ✅ NEW (4 tests) | Loading, unauthenticated, authenticated, role mismatch |
| `backend/services/queue.ts` | ❌ **0 tests** | Entirely untested |
| `backend/src/lib/cache.ts` | ❌ **0 tests** | Entirely untested |
| `backend/controllers/gigController.ts:triggerMatching` | ❌ **0 tests** | Untested endpoint |

---

## Execution Order

| Step | What | Status | Time |
|---|---|---|---|
| 1 | Fix `participationService.test.ts` — match test to real code | ✅ DONE | 15 min |
| 2 | Add auth middleware tests (JWT verify, role check) | ✅ DONE (10 tests) | 30 min |
| 3 | Add Zod schema tests for all 4 schemas | ✅ DONE (23 tests) | 20 min |
| 4 | Add endpoint tests (`triggerMatching`) | ❌ NOT DONE | 10 min |
| 5 | Add `ProtectedRoute` component test | ✅ DONE (4 tests) | 15 min |
| 6 | Add edge case tests for empty states, error paths | ❌ NOT DONE | 30 min |
| 7 | Fill gaps in `geo.test.ts` | ❌ NOT DONE | 15 min |

Done so far: 6 of 9 planned test files touched. 47 new/fixed tests added (back: 33 new, 2 fixes; front: 4 new, 4 fixes, 4 restored).

---

## Continuous Integration

The existing CI pipeline (`.github/workflows/deploy.yml`) already runs:

```yaml
- name: Test backend
  run: npx vitest run --reporter verbose
- name: Test frontend
  run: npx vitest run --reporter verbose
```

**Add:** Fail CI if test coverage drops below 60% on critical paths. Add `--coverage` flag to surface uncovered lines.

**Block PRs on:** Test failures, introduced misleading tests, skipped existing tests without documented reason.
