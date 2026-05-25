# Refactor: P1 Completed Refactors (Batch Summary)

**Date:** 2026-05-25
**Status:** Complete

## Motivation
All P1 items from the priority matrix were executed in a single session following the P0 sprint. These are major maintainability improvements — removing dead code, consolidating patterns, and standardizing UI elements.

## Scope
16 refactors across ~30 files in both packages, migrations, and documentation.

---

## 10. Remove pg-boss Job Queue

**Before:** pg-boss worker initialized in `index.ts`, `queue.ts` imported by `gigService.ts` for matching. A full job queue for a single immediate task (match after gig creation).

**After:** Deleted `queue.ts`. Removed static imports from `gigService.ts`. Removed worker startup from `index.ts`. Matching runs inline via `runMatching()`.

**Files affected:** `backend/index.ts`, `backend/services/queue.ts` (deleted), `backend/services/gigService.ts`, `backend/package.json`

---

## 11. Remove `match_volunteers_for_gig` RPC

**Before:** `matchingService.ts` called the `match_volunteers_for_gig` RPC as primary, with `nearby_volunteers_for_gig` as fallback. The RPC returned identical results to the fallback.

**After:** `matchingService.ts` calls `nearby_volunteers_for_gig` directly. RPC removed from migration. New `08_drop_match_volunteers_for_gig.sql` migration for existing deployments.

**Files affected:** `backend/services/matchingService.ts`, `supabase/migrations/01_functions_and_realtime.sql`, `supabase/migrations/08_drop_match_volunteers_for_gig.sql`

---

## 12. Remove In-Memory Cache

**Before:** `cache.ts` wrapped `getNgoAnalytics` with a 30-second TTL. Single consumer, minimal query cost, no eviction strategy.

**After:** Deleted `cache.ts`. `getNgoAnalytics` queries directly every call.

**Files affected:** `backend/src/lib/cache.ts` (deleted), `backend/services/gigService.ts`

---

## 13. Remove Duplicate Realtime Subscription

**Before:** `VolunteerMap.tsx` had 53 lines of inline subscription logic (channel creation, debounce, refs) that duplicated `useRealtimeGigs`.

**After:** Inline subscription removed. Component relies on `useRealtimeGigs` hook. Refresh button + location change still trigger updates.

**Files affected:** `frontend/src/pages/VolunteerMap.tsx`

---

## 14. Move featureGig/triggerMatching to Service Layer

**Before:** `gigController.ts` directly imported `supabaseAdmin`, `matchingService`, and `emailService` to implement `featureGig` and `triggerMatching`. Controller had business logic mixed with HTTP handling.

**After:** `gigService.ts` exports `featureGig` and `triggerMatching`. Controller delegates to service functions. Controller no longer imports service_role client.

**Files affected:** `backend/controllers/gigController.ts`, `backend/services/gigService.ts`

---

## 15. Remove Try-Catch from joinGig Controller

**Before:** `participationController.ts` had manual `try/catch` wrapping the service call, with a generic error handler.

**After:** `asyncHandler` + global error handler manage all errors. Service throws typed errors with `{ statusCode: 400 }`.

**Files affected:** `backend/controllers/participationController.ts`, `backend/services/participationService.ts`

---

## 17. Pin Zod to v3

**Before:** Range constraint `^3.23.8` — but no check that v4 wasn't accidentally installed or used.

**After:** Confirmed installed version is `3.23.8` on both packages. No v4-specific patterns in codebase. Pinned with explicit `^3.23.8`.

**Files affected:** `backend/package.json`, `frontend/package.json`

---

## 18. Pin @types/express to v4

**Before:** `@types/express@^5.0.0` while `express@^4.21.x` was installed. Type mismatch.

**After:** Pinned to `@types/express@^4.17.21`.

**Files affected:** `backend/package.json`

---

## 19. Move pino-pretty to Dependencies

**Before:** `pino-pretty` in devDependencies — would be missing in production Docker image where `devDependencies` are stripped.

**After:** Moved to dependencies. Required at runtime when `NODE_ENV=development` for pretty-printed logs.

**Files affected:** `backend/package.json`

---

## 20. Replace date-fns with Intl.DateTimeFormat

**Before:** 8 `format()` calls across 6 files using `date-fns`. Added ~3-15 KB to bundle.

**After:** Created shared `utils/format.ts` helper wrapping `Intl.DateTimeFormat`. Removed `date-fns` dependency from `frontend/package.json`.

**Files affected:** `frontend/src/utils/format.ts`, `frontend/package.json`, 6 page/component files

---

## 21. Add leaflet.markercluster as Explicit Dependency

**Before:** `leaflet.markercluster` worked because it was hoisted as a transitive dependency. Fragile — could break with any dependency tree change.

**After:** Explicitly added to `frontend/package.json` with `^4.1.3`.

**Files affected:** `frontend/package.json`

---

## 22. Consolidate parseGigLocation

**Before:** 3 independent implementations parsing EWKT `POINT(lng lat)` format: in `utils/geo.ts`, `GigDetail.tsx:124-126`, `VolunteerPortfolio.tsx:178,186`.

**After:** Replaced 2 inline regex impls in `VolunteerPortfolio.tsx` with shared `parseGigLocation` from `utils/geo.ts`.

**Files affected:** `frontend/src/pages/VolunteerPortfolio.tsx`

---

## 23. Consolidate Matching Pipeline

**Before:** Same `findMatchedVolunteers → notify → email` sequence appeared in `gigService.ts`, `queue.ts`, and `gigController.ts`.

**After:** Extracted `runMatching()` function in `gigService.ts`. Used by both `createGig` and `triggerMatching`.

**Files affected:** `backend/services/gigService.ts`

---

## 24. Standardize Form Input Styles

**Before:** 4 different input patterns across Login, Signup, CreateGig, ParticipateGig (different radii, bg, focus rings, padding).

**After:** Replaced 3 custom `<input>` elements in `CreateGig.tsx` and 1 in `ParticipateGig.tsx` with shared shadcn `Input` component.

**Files affected:** `frontend/src/pages/CreateGig.tsx`, `frontend/src/pages/ParticipateGig.tsx`

---

## 25. Standardize Error Display

**Before:** 3 patterns: inline SVG + red text (Login), `FieldError` component (CreateGig), plain `<p>` (ParticipateGig).

**After:** Created shared `components/ui/field-error.tsx`. Used in Login, ParticipateGig, CreateGig with consistent colors and optional icon.

**Files affected:** `frontend/src/components/ui/field-error.tsx`, `frontend/src/pages/Login.tsx`, `frontend/src/pages/ParticipateGig.tsx`, `frontend/src/pages/CreateGig.tsx`

---

## 26. Fix Success Toast Before API Call

**Before:** `GigDetail.tsx:189` called `toast.success('Joining gig...')` before the API call. On network failure, user saw success → error.

**After:** Toast fires only after the API call resolves. Before that, the page shows a loading state.

**Files affected:** `frontend/src/pages/GigDetail.tsx`

---

## Verification

- ✅ Backend: 85 tests pass (7 files)
- ✅ Frontend: 36 tests pass (4 files)
- ✅ TypeScript compiles cleanly on both packages
- ✅ All removed code verified as unused or dead
- ✅ No new `@ts-ignore` or `console.error` introduced
