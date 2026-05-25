# Dependency Audit

**Date:** 2026-05-25
**Scope:** All runtime + dev dependencies in `backend/package.json` and `frontend/package.json`
**Method:** Source-level import tracing + bundle size analysis + maintenance risk check

---

## Summary

| Result | Count | Packages |
|---|---|---|
| **Remove immediately** | 3 | `ws` (backend), `date-fns` (frontend), `DEEPSEEK_API_KEY` (env, not a package) |
| **Misclassified** | 1 | `pino-pretty` (devDep → dependency) |
| **Can be converted to dynamic import** | 1 | `pg-boss` (avoid loading when not used) |
| **Underutilized** | 1 | `lucide-react` (1 of 12 icon-using files) |
| **Fragile transitive dep** | 1 | `leaflet.markercluster` (not in package.json, hoisted) |
| **Type version mismatch** | 1 | `@types/express@^5.0.0` with Express 4 |
| **Hard requirement (no action)** | 18 | All remaining dependencies |

---

## 1. Backend Dependencies

### 1.1 `ws` — **Remove**

| Field | Value |
|---|---|
| Listed as | `dependencies` |
| Version | `^8.21.0` |
| Imported in | `services/supabase.ts` only |
| Used as | `realtime: { transport: ws as any }` |

**Why it exists:** Passes the `ws` WebSocket constructor to `createClient()` for Supabase Realtime transport.

**Why it can be removed:** The **backend never subscribes to any Realtime channels**. Every Realtime subscription lives in the browser (frontend). The `supabaseAdmin` client is used exclusively for REST-style queries (`.from()`, `.rpc()`, `.auth.getUser()`) — none require WebSocket transport. The `realtime: { transport: ws }` config option is dead configuration.

**Risk of removal:** None. Remove the `realtime` block from the `createClient` options and delete the import. The `@types/ws` dev dependency becomes unnecessary too.

**Bundle impact:** ~100KB module no longer loaded at startup.

**Node 22 note:** Native `WebSocket` is available globally if needed in the future.

---

### 1.2 `pino-pretty` — **Misclassified (move to dependencies)**

| Field | Value |
|---|---|
| Listed as | `devDependencies` |
| Version | `^13.1.3` |
| Used in | `src/lib/logger.ts` (dynamic transport target) |

**Why it's misclassified:** `pino-pretty` is referenced as a **dynamic transport target string** in the pino config:
```ts
transport: process.env.NODE_ENV !== 'production'
  ? { target: 'pino-pretty', options: { colorize: true } }
  : undefined
```
Pino loads this at **runtime** via dynamic `import()`. In `devDependencies`, `npm install --production` will not install it, causing pino to crash if `NODE_ENV` is anything other than `'production'`.

**Fix:** Move to `dependencies`.

---

### 1.3 `pg-boss` — **Convert to dynamic import**

| Field | Value |
|---|---|
| Listed as | `dependencies` |
| Version | `^10.4.2` |
| Imported in | `services/queue.ts` (top-level `import`) |

**Why it's conditional:** `getQueue()` returns `null` if `DATABASE_URL` is not set. The matching fallback runs synchronously when the queue is unavailable. In dev and most deployments, the queue path is never activated — but `pg-boss` is still loaded into memory at startup via the top-level `import`.

**Fix:** Replace the static `import PgBoss from 'pg-boss'` with `const { default: PgBoss } = await import('pg-boss')` inside `getQueue()` so the module is only loaded when `DATABASE_URL` is configured.

---

### 1.4 `dotenv` — **Deduplicate loading**

| Field | Value |
|---|---|
| Imported in | `index.ts` + `services/supabase.ts` |
| Calls | Both files call `dotenv.config()` |

**Issue:** `.env` is loaded twice. `supabase.ts` is imported by every service file, so `dotenv.config()` runs both at module evaluation time (when `index.ts` imports services). Harmless but unnecessary.

**Fix:** Guard the `dotenv.config()` call in `supabase.ts` with `if (!process.env.SUPABASE_URL)` so it becomes a no-op on second call.

---

### 1.5 `compression` — **Optional (proxy-dependent)**

| Field | Value |
|---|---|
| Imported in | `index.ts` only |
| Usage | `app.use(compression())` |

**Could remove if behind Caddy/nginx:** The deployment uses Caddy as a reverse proxy, which can handle gzip/brotli compression at the edge. However, for direct deployments (no proxy), compression is useful. Keep unless you're certain every deployment has proxy-level compression.

---

### 1.6 `cors` — **Keep**

Standard middleware. Could be inlined (5 lines of manual headers) but not worth the maintenance cost.

---

### 1.7 Hard Requirements (Keep)

| Package | Why | Import count |
|---|---|---|
| `express` | HTTP framework | 8 files |
| `@supabase/supabase-js` | Database + auth | 6 files |
| `zod` | Schema validation | 3 files |
| `pino` | Structured logging + secret redaction | 7 files (1 direct + 6 consumers) |

---

## 2. Frontend Dependencies

### 2.1 `date-fns` — **Remove (replace with native `Intl.DateTimeFormat`)**

| Field | Value |
|---|---|
| Listed as | `dependencies` |
| Version | `^4.3.0` |
| Imported in | 6 files |
| Usage pattern | `format(date, pattern)` — every single use |

**All 6 files only use the `format` function.** Every pattern has a direct `Intl.DateTimeFormat` equivalent:

| Current | Pattern | Native Replacement |
|---|---|---|
| `format(new Date(), 'MMM d, yyyy')` | Month day, year | `Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })` |
| `format(gig.gig_date, 'EEEE, MMMM d, yyyy')` | Full weekday, month day, year | `Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })` |
| `format(gig.gig_date, 'h:mm a')` | Hour:min AM/PM | `Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' })` |
| `format(n.created_at, 'MMM d, h:mm a')` | Short month day, time | `Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })` |

**Files affected:**
- `pages/NgoDashboard.tsx` (line 112)
- `pages/GigDetail.tsx` (lines 348, 351)
- `pages/VolunteerPortfolio.tsx` (lines 525, 589)
- `pages/PublicPortfolio.tsx` (line 241)
- `components/NotificationBell.tsx` (line 78)
- `pages/ParticipateGig.tsx` (line 182)

**Tradeoff:** `Intl.DateTimeFormat` uses the user's locale by default. Current `date-fns` calls use hardcoded `'en-US'` patterns — they do not respect user locale either. No functional regression.

**Savings:** ~3-15 KB gzipped (tree-shaken vs full).

---

### 2.2 `lucide-react` — **Underutilized (keep, use more)**

| Field | Value |
|---|---|
| Listed as | `dependencies` |
| Version | `^1.16.0` |
| Imported in | Only `components/Navbar.tsx` (11 icons) |
| Inline SVGs across | **12 files**, ~97+ SVG elements |

**Verdict:** Already installed, tree-shakeable, actively maintained. The problem is **under-use**, not over-use. The project has 12 files with inline SVGs that should use `lucide-react` instead. Migrating inline SVGs would:
- Reduce HTML DOM size (inline SVGs are larger in markup than `<IconName>` components)
- Improve accessibility (lucide icons include `aria-hidden` / `aria-label` by default)
- Consolidate icon style across the app
- Zero additional cost

**Action:** Migrate inline SVGs to `lucide-react` systematically. Not a removal — a standardization.

---

### 2.3 `recharts` — **Heavy, justified for now**

| Field | Value |
|---|---|
| Listed as | `dependencies` |
| Version | `^3.8.1` |
| Size | ~40 KB gzipped |
| Imported in | 3 files (Leaderboard, AnalyticsCharts, ui/chart) |

**Verdict:** It's the heaviest single frontend dependency by a wide margin. The app only uses `BarChart` and `AreaChart` — a fraction of recharts' capability. If the bundle size becomes a concern, consider:

1. **Custom SVG components** — both chart types are simple enough to render with 20-30 lines of SVG each
2. **`lightweight-charts`** — ~10 KB gzipped
3. **`echarts`** — more features but similar size

For now, keep. Track in bundle analysis as a refactor candidate.

---

### 2.4 `leaflet.markercluster` — **Fragile transitive dependency**

| Field | Value |
|---|---|
| Listed as | **Not in package.json** |
| Exists as | Hoisted transitive dep of `react-leaflet-cluster` |
| CSS imported from | `node_modules/leaflet.markercluster/dist/` |

**Risk:** If `react-leaflet-cluster` changes or removes its dependency on `leaflet.markercluster`, or if npm's hoisting algorithm changes, the CSS imports in `index.css` will break at build time.

**Fix:** Add `leaflet.markercluster` as an explicit dependency in `package.json` (even if it's a transitive dep). This pins the version and ensures the CSS is always available.

---

### 2.5 Hard Requirements (Keep)

| Package | Why | Files |
|---|---|---|
| `@supabase/supabase-js` | Database, auth, realtime, storage | 12+ files |
| `react-hook-form` + `@hookform/resolvers` | Form state + Zod integration | 4 form pages |
| `zod` | Runtime schema validation | 4 form pages |
| `react-router-dom` | SPA routing | 14 files |
| `leaflet` + `react-leaflet` | Mapping | 1 file (MapView) |
| `react-leaflet-cluster` | Marker clustering | 1 file (MapView) |
| `sonner` | Toast notifications | 3 files |
| `tailwind-merge` + `clsx` | Tailwind class merging | 9 shadcn components |
| `class-variance-authority` | shadcn variant API | 2 components |
| `vite-plugin-pwa` | PWA service worker | Build-time only |

---

## 3. Version Mismatch Issues

### 3.1 `@types/express@^5.0.0` vs `express@^4.21.2`

**Risk:** Express 5 types may include types for APIs that don't exist in Express 4 (or may omit types that do). This can produce false TypeScript errors — or worse, suppress type errors that should be caught.

**Fix:** Pin to `@types/express@^4.17.21` to match the Express 4 runtime.

### 3.2 `zod@^4.4.3` on both packages — v3 API patterns

**Risk:** The codebase uses Zod v3 API (`z.object()`, `z.string()`, `z.coerce.number()`, `safeParse`). Zod v4 changed the API (`z.struct()`, `z.string()`, etc.) in early RCs. If the installed v4 release has breaking changes, runtime schemas will fail.

**Fix:** Pin both packages to `zod@^3.23.8` (stable, widely tested) unless the team has verified v4 compatibility and migrated the API patterns. Check `node_modules/zod/package.json` to confirm what's actually installed — the semver `^4.4.3` constraint may have resolved to a v3-compatible v4 RC, or to actual v4 which would break.

---

## 4. Dead Configuration / Orphaned Secrets

### 4.1 `DEEPSEEK_API_KEY` in `backend/.env`

**Status:** Orphaned. The variable `DEEPSEEK_API_KEY` (and `DEEPSEEK_BASE_URL`) are not referenced anywhere in any `.ts` source file. Not imported, not used.

**Action:** Remove from `.env`. The credential should be rotated if it was ever in a real environment.

### 4.2 `render.yaml`

**Status:** Stale. `render.yaml` configures a Render deployment, but the CI/CD pipeline uses GHCR + SSH deploy. The file documents a deprecated deployment path.

**Action:** Either remove or update to reflect current deployment strategy. If Render is an alternate deployment target, document this clearly.

---

## 5. Bundle Size Impact Summary

| Tier | Packages | Size (gzipped) | Action |
|---|---|---|---|
| Framework | react + react-dom | ~45 KB | Keep (unavoidable) |
| Heavy | recharts | ~40 KB | Track as refactor candidate |
| Heavy | leaflet + react-leaflet | ~40 KB | Keep (core feature) |
| Medium | @supabase/supabase-js | ~30 KB | Keep |
| Medium | react-router-dom | ~15 KB | Keep |
| Medium | react-hook-form | ~10 KB | Keep |
| Small | sonner, tailwind-merge, zod, lucide-react | 5-10 KB each | Keep |
| **Remove** | **date-fns** | **~3-15 KB** | **Replace with native `Intl`** |
| Negligible | clsx, class-variance-authority | <1 KB each | Keep (or inline) |

**Frontend total baseline:** ~170+ KB before any application code. This is high but acceptable for a mapping PWA. The `date-fns` removal saves ~3-15 KB.

---

## 6. Maintenance Risk Matrix

| Risk Level | Packages | Count |
|---|---|---|
| **Active (good)** | supabase-js, zod, react, react-hook-form, lucide-react, pino, vitest, tsx, vite | 9 |
| **Stable (low maintenance)** | leaflet, recharts, express, cors, compression, dotenv, pg-boss | 7 |
| **Low maintenance (risk)** | leaflet.markercluster, react-leaflet-cluster | 2 |
| **Clean record (no CVEs)** | All packages (no critical security advisories) | — |

**No package in the stack is abandoned.** The lowest maintenance items are the Leaflet cluster plugins, which are stable (feature-complete) rather than abandoned.

---

## 7. Action Items (Priority Order)

| Priority | Action | Package | Effort | Impact |
|---|---|---|---|---|
| 1 | **Remove `ws`** — backend doesn't use Realtime | Backend `ws` | 5 min | Module cleanup |
| 2 | **Move `pino-pretty`** to `dependencies` | Backend | 1 min | Fixes potential crash |
| 3 | **Check `zod` installed version** — v3 vs v4 mismatch | Both | 5 min | Prevents runtime failure |
| 4 | **Pin `@types/express`** to v4 | Backend | 1 min | Correct types |
| 5 | **Remove `DEEPSEEK_API_KEY`** from `.env` | Backend | 1 min | Security |
| 6 | **Replace `date-fns`** with native `Intl.DateTimeFormat` | Frontend | 30 min | Saves 3-15 KB in bundle |
| 7 | **Add `leaflet.markercluster`** as explicit dependency | Frontend | 2 min | Fixes fragile transitive dep |
| 8 | **Migrate inline SVGs** to `lucide-react` | Frontend | 2-3 hrs | Consistency, accessibility |
| 9 | **Convert `pg-boss`** to dynamic import | Backend | 10 min | Avoid unnecessary loading |
| 10 | **Track `recharts` weight** for future replacement | Frontend | — | Monitor |
