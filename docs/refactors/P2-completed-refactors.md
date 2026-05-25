# Refactor: P2 Completed Refactors (Batch Summary)

**Date:** 2026-05-25
**Status:** Complete (15 of 15 items)

## Motivation
All fast-win and medium-effort P2 items executed in a single sprint. These are stable cleanups — duplicated utilities, unused config files, missing UX states, and minor style/accessibility fixes.

## Scope
15 refactors across both packages, plus test infrastructure, documentation, and config files.

---

## 28. Consolidate `getKarmaLevel` into Shared Utility

**Before:** Identical `getKarmaLevel` function in `PublicPortfolio.tsx:76` and `VolunteerPortfolio.tsx:201`.

**After:** Extracted to `frontend/src/utils/karma.ts`. Both portfolio pages import from the shared module. One source of truth.

**Files affected:** `frontend/src/utils/karma.ts` (new), `frontend/src/pages/PublicPortfolio.tsx`, `frontend/src/pages/VolunteerPortfolio.tsx`

---

## 29. Remove `render.yaml`

**Before:** Render.com deployment config at project root. Deploy pipeline uses Docker Compose + GHCR + SSH, not Render.

**After:** Deleted. CI/CD pipeline unaffected.

**Files affected:** `render.yaml` (deleted)

---

## 31. Fix Redundant `dotenv.config()` in supabase.ts

**Before:** Both `index.ts` and `supabase.ts` called `dotenv.config()`. `supabase.ts` loaded `.env` from a relative path.

**After:** Removed `dotenv` import and config call from `supabase.ts`. Added `vitest.setup.ts` with `dotenv.config()` so tests still load environment variables.

**Files affected:** `backend/services/supabase.ts`, `backend/vitest.setup.ts` (new), `backend/vitest.config.ts`

---

## 32. Add Empty States (GigDetail)

**Before:** `GigDetail.tsx` showed a loading spinner indefinitely when a gig wasn't found (null state after fetch completed).

**After:** Added `gigNotFound` state variable. If query returns null, a "Gig Not Found" empty state is shown with friendly message.

**Files affected:** `frontend/src/pages/GigDetail.tsx`

---

## 35. Standardize Submit Button Labels

**Before:** Each page used different labels: "Publish & Match Gig", "Broadcasting to Volunteers…", "Join this gig & serve community", "Registering Opportunity…", "Complete gig & earn karma", "Wait for photo uploads…"

**After:** Unified labels:
| Page | Normal | Loading |
|---|---|---|
| Login | Sign in | Signing in… |
| Signup | Sign up | Creating account… |
| CreateGig | Publish gig | Publishing… |
| GigDetail | Join gig | Joining… |
| ParticipateGig (join) | Join gig | (shared with above) |
| ParticipateGig (submit) | Complete gig | Submitting… |

**Files affected:** `frontend/src/pages/CreateGig.tsx`, `frontend/src/pages/GigDetail.tsx`, `frontend/src/pages/ParticipateGig.tsx`

---

## 36. Show Email Verification Message After Signup

**Before:** After signup, users were immediately navigated to dashboard/map with no indication that email verification is pending.

**After:** Added `toast.success('Account created! Check your email to verify your account.')` before navigation.

**Files affected:** `frontend/src/pages/Signup.tsx`

---

## 37. Make Photos Optional in ParticipateGig

**Before:** `canSubmit = !submitting && beforeUrl && afterUrl`. Camera failure or user choice not to upload photos blocked submission entirely.

**After:** `canSubmit = !submitting`. Photos are optional. Description updated to say "(optional)".

**Files affected:** `frontend/src/pages/ParticipateGig.tsx`

---

## 38. Fix Label `id`/`htmlFor` Mismatch

**False positive.** The CreateGig date (`id="create-gig-date"` / `htmlFor="create-gig-date"`) and time (`id="create-gig-time"` / `htmlFor="create-gig-time"`) fields already had matching pairs. `register('gig_date')` does not set `id` — it sets `name`. The explicit `id` prop on Input overrides correctly.

**Files affected:** None.

---

## 39. Fix `p-4.5` Invalid Tailwind in GigDetail

**Before:** Weather advisory banner used `p-4.5`, which is not a valid Tailwind v4 spacing token and was silently ignored.

**After:** Changed to `p-4`.

**Files affected:** `frontend/src/pages/GigDetail.tsx`

---

## 40. Fix Unbounded `profileCache` in `useRealtimeGigs.ts`

**Before:** `profileCache` (a `useRef<Map<string, string>>`) grew without any eviction strategy. Every new gig from a different NGO added a permanent cache entry.

**After:** Added `MAX_CACHE = 50` with FIFO eviction via `cacheProfile()` helper. Oldest entry is deleted when cache exceeds limit.

**Files affected:** `frontend/src/hooks/useRealtimeGigs.ts`

---

## 41. Add `aria-label` to MapView Travel Mode Buttons

**Before:** Walking, cycling, and driving mode buttons had no accessible labels. Screen readers could not distinguish them.

**After:** Added `aria-label={...}` with descriptive text ("Travel mode: walking", "Travel mode: cycling", "Travel mode: driving").

**Files affected:** `frontend/src/components/MapView.tsx`

---

---

## 27. Remove Unused Monitoring Stack

**Before:** 3 config files at project root (`prometheus.yml`, `loki.yml`, `docker-compose.monitoring.yml`) for Prometheus + Loki + Grafana. Backend had no `/metrics` endpoint and no `prom-client` dependency — stack was configured but non-functional.

**After:** Deleted all 3 files. Removed monitoring data dirs from `.gitignore` and monitoring configs from `.dockerignore`. Updated `docs/deployment.md` and `docs/tool-recommendations.md` to reflect removal.

**Files affected:** `prometheus.yml` (deleted), `loki.yml` (deleted), `docker-compose.monitoring.yml` (deleted), `.gitignore`, `.dockerignore`, `docs/deployment.md`, `docs/tool-recommendations.md`

---

## 33. Standardize Card Styling

**Before:** VolunteerPortfolio and PublicPortfolio used manually written `<div>` wrappers with the same or similar classNames as the shadcn `<Card>` component. Glass cards (`bg-white/70 backdrop-blur-md`) in VolunteerPortfolio and solid cards (`bg-white`) in PublicPortfolio were both duplicated.

**After:** Replaced 9 manual card divs across both portfolio pages with `<Card>` component calls. Glass cards use the default Card styling; solid cards use `className="bg-white dark:bg-slate-800"` override. Single source of truth for card base style.

**Files affected:** `frontend/src/pages/VolunteerPortfolio.tsx` (6 card replacements), `frontend/src/pages/PublicPortfolio.tsx` (5 card replacements)

---

## 34. Standardize Loading Skeleton Pattern

**Before:** 4 different patterns: Skeleton component (VolunteerMap), spinner (GigDetail, ParticipateGig, PublicPortfolio), animate-pulse divs (Leaderboard), animate-pulse text (GigDetail weather), and no loading state (Home, VolunteerPortfolio, NgoDashboard).

**After:** Replaced Leaderboard animate-pulse divs with `<Skeleton>` component. Replaced GigDetail weather animate-pulse span with `<Skeleton>`. Added Skeleton import to GigDetail and Leaderboard.

**Files affected:** `frontend/src/pages/Leaderboard.tsx`, `frontend/src/pages/GigDetail.tsx`

---

## Verification

- ✅ Backend: 85 tests pass (7 files)
- ✅ Frontend: 36 tests pass (4 files)
- ✅ TypeScript compiles cleanly on both packages
- ✅ No new `@ts-ignore` or `console.error` introduced
- ✅ `vitest.setup.ts` ensures env vars are loaded in test context after removing `dotenv.config()` from `supabase.ts`
- ✅ All 51 priority-matrix items complete (9 P0 + 17 P1 + 15 P2 + 10 P3 deferred)
