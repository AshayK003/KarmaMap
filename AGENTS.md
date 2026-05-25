# KarmaMap — AI Agent Context

## Overview
A hyper-local, real-time PWA connecting local NGOs with nearby volunteers. Uses PostGIS geospatial queries, smart proximity+skill matching, OSRM road routing, and verified impact portfolios.

## Tech Stack
| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript 6, Vite 6, Tailwind CSS v4, **shadcn/ui** |
| Backend | Node.js + Express 4 + TypeScript (ESM) |
| Database | Supabase (PostgreSQL + PostGIS), service_role key for backend |
| Mapping | React-Leaflet + react-leaflet-cluster, OpenStreetMap tiles, OSRM routing, Photon geocoding |
| Weather | Open-Meteo API (free, no key) |
| Email | EmailJS (REST API via `fetch`, not SDK) |
| PWA | vite-plugin-pwa (Workbox, OSM tile caching) |
| Auth | Supabase Auth (JWT) |
| Charts | Recharts |

## Project Structure
```
KarmaMap/
├── backend/                  # Express REST API (port 3001)
│   ├── index.ts              # Entry point + global error handler
│   ├── routes/               # gigs.ts, participations.ts, payments.ts, organizations.ts
│   ├── controllers/          # gigController.ts, participationController.ts, paymentController.ts, organizationController.ts
│   ├── middleware/
│   │   ├── auth.ts           # verifyJwt + requireRole (Supabase Auth)
│   │   ├── validate.ts       # Zod body validation
│   │   └── asyncHandler.ts   # Async error wrapper for Express
│   ├── src/lib/logger.ts
│   ├── scripts/
│   │   └── applyMigration.ts # Auto-apply migration (direct DB + pooler fallback)
│   ├── services/
│   │   ├── supabase.ts       # service_role admin client
│   │   ├── matchingService.ts # 0.5*proximity + 0.5*skill, 2-tier fallback
│   │   ├── emailService.ts   # EmailJS REST via native fetch
│   │   ├── gigService.ts     # createGig, getNgoAnalytics, verifyGigOwnership
│   │   ├── participationService.ts # joinGig, completeParticipation, awardKarma
│   │   ├── paymentService.ts  # createPayment, confirmPayment, getNgoPayments
│   │   └── organizationService.ts # getOrgAnalytics, getMyOrg, updateOptIn,
│   │                            #   addOrgMember, getOrgMembers, getOrgName
├── frontend/                 # React SPA (port 5173)
│   └── src/
│       ├── App.tsx            # 13 routes + AuthProvider + Navbar + ErrorBoundary
│       ├── pages/             # Home, Login, Signup, VolunteerMap, GigDetail,
│       │                      #   ParticipateGig, NgoDashboard, CreateGig,
│       │                      #   VolunteerPortfolio, PublicPortfolio,
│       │                      #   Leaderboard, CorporateDashboard,
│       │                      #   OrganizationManage
│       ├── components/
│   │   ├── ui/            # 9 shadcn/ui components: Button, Card, Badge,
│   │   │                  #   Input, Avatar, Progress, Skeleton,
│   │   │                  #   Tabs, Chart (cn() from lib/utils)
│   │   ├── ErrorBoundary.tsx # Route-level error boundary (fallback UI)
│       │   ├── NotificationBell.tsx # In-app notification dropdown (realtime)
│       │   ├── MapView.tsx    # Leaflet + OSRM routing + cluster markers
│       │   ├── LocationPicker.tsx
│       │   ├── PlaceSearch.tsx # Photon geocoding w/ debounce
│       │   ├── GigCard.tsx    # Volunteer-facing discovery card
│       │   ├── NgoGigCard.tsx # NGO management w/ status buttons
│       │   ├── DashboardCard.tsx
│       │   ├── AnalyticsCharts.tsx # Recharts bar/area
│       │   ├── Certificate.tsx # Printable gold-bordered certificate
│       │   ├── PhotoUpload.tsx # Camera capture + local preview
│       │   ├── Navbar.tsx
│   │   ├── NavIcons.tsx # 14 inline SVG icons (no icon library)
│       │   └── ProtectedRoute.tsx # Role-based route guard
│       ├── context/           # AuthContext.tsx, ThemeContext.tsx
│       ├── hooks/             # useGeolocation, useLocationPicker,
│       │                      #   useRealtimeGigs, useRealtimeParticipations,
│       │                      #   useRealtimeNotifications
│       ├── services/          # gigs.ts, geocoding.ts, storage.ts
│       ├── types/             # database.ts (TS types + DB namespace)
│       ├── lib/               # supabase.ts, utils.ts (tailwind-merge + clsx)
│       └── utils/             # api.ts, geo.ts, weather.tsx, format.ts
├── supabase/migrations/      # 11 SQL files
│   ├── 00_schema_core.sql
│   ├── 01_functions_and_realtime.sql
│   ├── 02_featured_gigs.sql
│   ├── 03_atomic_karma.sql
│   ├── 04_analytics_optimization.sql
│   ├── 06_location_label.sql
│   ├── 07_fix_location_drift.sql
│   ├── 08_drop_match_volunteers_for_gig.sql
│   ├── 09_payments.sql
│   ├── 10_corporate_dashboard.sql
│   └── storage_policies.sql
├── vercel.json               # Frontend deploy (Vercel)
├── docs/
│   ├── deployment.md          # Vercel + Render deploy guide
│   ├── INDEX.md               # Master table of contents for docs/
│   ├── architecture/          # System architecture docs
│   ├── decisions/             # ADRs
│   ├── reviews/               # Code review records, audit reports
│   ├── bugs/                  # Bug reports
│   ├── refactors/             # Refactoring plans and records
│   ├── flows/                 # Data flows and process workflows
│   └── deployment/            # Runbooks and operational guides
├── .env.example
├── AGENTS.md
```


## Roles & Routing (13 pages)
- **Volunteer**: `/map` (discovery), `/portfolio`, `/gigs/:id`, `/gigs/:id/participate`, `/leaderboard`, `/corporate/dashboard` (if org member), `/corporate/manage` (if org admin)
- **NGO**: `/ngo/dashboard`, `/ngo/create-gig`, `/leaderboard`, `/corporate/dashboard` (if org member), `/corporate/manage` (if org admin)
- **Public**: `/` (home), `/login`, `/signup`, `/p/:slug` (public portfolio)

## API Endpoints (Express backend)
| Method | Path | Auth | Role | Description |
|---|---|---|---|---|
| GET | `/health` | — | — | Health check |
| POST | `/api/gigs` | JWT | ngo | Create gig + trigger matching + email |
| GET | `/api/gigs/analytics` | JWT | ngo | Dashboard analytics (hours, chart data) |
| POST | `/api/gigs/:gigId/match` | JWT | ngo | Manual re-match + notify |
| PATCH | `/api/gigs/:gigId/feature` | JWT | ngo | Feature a gig for N hours (sets `featured_until`) |
| POST | `/api/participations/join/:gigId` | JWT | volunteer | Join a gig (returns 409 if already joined) |
| PATCH | `/api/participations/:participationId/complete` | JWT | volunteer | Complete with photos/hours + award karma |
| POST | `/api/payments` | JWT | ngo | Create payment request for feature gig |
| POST | `/api/payments/:paymentId/confirm` | JWT | ngo | Confirm payment + feature gig (manual invoicing) |
| GET | `/api/payments` | JWT | ngo | List NGO's payment history |

**Data flow**: Frontend uses Supabase anon client for reads (RPCs, direct queries). Backend uses service_role client for writes. REST API calls inject JWT via `utils/api.ts`. `apiFetch` tries direct backend URL (`http://localhost:3001`) first, then falls back to Vite proxy.

| Method | Path | Auth | Role | Description |
|---|---|---|---|---|
| GET | `/api/organizations/analytics` | JWT | — | CSR analytics (hours, charts, recent activity) |
| GET | `/api/organizations/my-org` | JWT | — | Current user's org membership + org info |
| POST | `/api/organizations/opt-in` | JWT | — | Toggle data-sharing opt-in |
| POST | `/api/organizations/members` | JWT | admin | Add member to org |
| GET | `/api/organizations/members` | JWT | admin | List org members |

## Backend Exports Reference

### Controllers
- **gigController.ts**: `createGigSchema` (Zod), `featureGigSchema` (Zod), `createGig`, `getNgoAnalytics`, `featureGig`, `triggerMatching`
- **participationController.ts**: `completeGigSchema` (Zod), `joinGig`, `completeParticipation`
- **paymentController.ts**: `createPaymentSchema` (Zod), `createPayment`, `confirmPayment`, `getPayments`
- **organizationController.ts**: `addMemberSchema` (Zod), `getOrgAnalytics`, `getMyOrg`, `updateOptIn`, `addOrgMember`, `getOrgMembers`

### Middleware
- **auth.ts**: `AuthRequest` (interface), `verifyJwt`, `requireRole(...roles)`
- **validate.ts**: `validateBody<T>(schema)`
- **asyncHandler.ts**: `asyncHandler(fn)` — wraps async Express handlers

### Services
- **supabase.ts**: `supabaseAdmin` (service_role SupabaseClient)
- **matchingService.ts**: `MatchedVolunteer` (interface), `findMatchedVolunteers(gigId, radius?, limit?)`, `notifyMatchedVolunteers(gigId, volunteers, gigTitle)`
- **emailService.ts**: `sendEmail(params)`, `sendGigMatchEmails(volunteers, gigTitle)`, `sendCompletionEmail(email, name, gigTitle)`
- **gigService.ts**: `createGig`, `getNgoAnalytics`, `verifyGigOwnership`, `getGigOwnership`
- **participationService.ts**: `completeParticipation`, `joinGig`, `awardKarma`
- **paymentService.ts**: `createPayment`, `confirmPayment`, `getNgoPayments`
- **organizationService.ts**: `getOrgAnalytics`, `getMyOrg`, `updateOptIn`, `addOrgMember`, `getOrgMembers`, `getOrgName`

## Database (PostgreSQL + PostGIS)
**Custom enums**: `user_role` (volunteer, ngo), `gig_status` (open, in_progress, completed, cancelled), `participation_status` (pending, joined, checked_in, completed, cancelled)

**Core tables**: `profiles` (id, role, skills[], location GEOGRAPHY, karma_points, streak, portfolio_slug, bio), `gigs` (id, ngo_id, location GEOGRAPHY, required_skills[], volunteers_needed, volunteers_joined, gig_date, status, featured_until), `participations` (id, volunteer_id, gig_id, status, before/after_photo_url, hours), `notifications` (id, user_id, message, read_status, gig_id).

**Key RPCs**: `nearby_gigs(lat, lng, radius_meters)` — returns featured first, then by distance; `insert_gig(...)`, `update_profile_location(lat, lng)`, `nearby_volunteers_for_gig(gig_id, radius)`, `award_karma(p_user_id, p_hours)` — atomic karma increment.

**Triggers**: auto-create profile on signup (`handle_new_user`), auto-update `updated_at` (`set_updated_at`), increment `volunteers_joined` on participation insert (`increment_gig_volunteers`).

**Realtime**: `gigs`, `participations`, `notifications` published to `supabase_realtime`.

**RLS**: 13 policies across all 4 tables + 4 storage policies on `participation-photos` bucket + 1 policy on `organization_members`.

## Matching Algorithm (`matchingService.ts`)
```
final_score = 0.5 * proximityScore + 0.5 * skillOverlap
```
**Fallback chain** (2 tiers):
1. `nearby_volunteers_for_gig` RPC (primary — ordered by distance)
2. All volunteer profiles scored with fixed 5000m distance (last resort — skips redundant RPC retry)

**Notifications**: `notifyMatchedVolunteers` inserts into `notifications` table; `sendGigMatchEmails` calls EmailJS via `fetch`.

## Key Architecture Notes

### Frontend
- **Auth state**: AuthContext listens to `onAuthStateChange`; `signUp` passes role/skills via `user_metadata`. Auth context functions (`signUp`, `signIn`, `signOut`, `refreshProfile`) wrapped in `useCallback` so `useMemo` on context value actually stabilizes references and prevents cascading re-renders.
- **Route-level ErrorBoundary** in `App.tsx` wraps all lazy-loaded routes — a crash in any page shows a fallback UI with retry button instead of a white screen.
- **Map center**: DEFAULT_CENTER = Delhi (28.6139, 77.209), NOT Lucknow. Lucknow RDSO preset = (26.8193, 80.8853) exported as `PRESET_LUCKNOW_RDSO` from `useLocationPicker.ts`. Map zoom = 13.
- **shadcn/ui**: 9 components in `src/components/ui/` — import via `@/components/ui/button`
- **Location**: Use `useLocationPicker()` hook which wraps `useGeolocation()` for GPS; supports GPS, preset, manual coords, search (Photon), and map click sources
- **Realtime**: `useRealtimeGigs(ngoId?)` for gig subscriptions; `useRealtimeParticipations(gigId?)` for participation count updates on GigDetail; `useRealtimeNotifications(userId?)` subscribes to `notifications` channel
- **Marker clustering**: `react-leaflet-cluster` (v4.1.3) wraps `<Marker>` children in `<MarkerClusterGroup>` — `chunkedLoading`, `maxClusterRadius=60`, `disableClusteringAtZoom=16`; CSS imported from `leaflet.markercluster/dist/`
- **NotificationBell**: Inline SVG bell icon in Navbar for all auth'd users; dropdown with unread count, mark read, mark all read, link to gig. Notification items are keyboard accessible (`role="button"`, `tabIndex={0}`, Enter/Space handlers).
- **Leaderboard**: `/leaderboard` route — `SELECT name, karma_points, streak FROM profiles WHERE role='volunteer' ORDER BY karma_points DESC LIMIT 50`; Recharts `BarChart` (horizontal, top 10); medals for top 3
- **Best Match sort**: `sortMode` state in `VolunteerMap.tsx` toggles between `'nearest'` (RPC default) and `'best_match'` (client-side reorder via `skillOverlapScore`) — disabled when profile has no skills
- **Add to Calendar**: ICS generator button on GigDetail — 3h default duration, GeoJSON/EWKT location parsed via `parseGigLocation`, Blob download
- **NgoGigCard**: Shows gig details with status management buttons (start, complete, close, reopen). No inline edit feature.
- **Dark mode**: `ThemeContext` with `ThemeProvider` wrapping app; reads `localStorage('karmamap-theme')` with system `prefers-color-scheme` fallback; toggles `dark` class on `<html>`; Tailwind v4 `@custom-variant dark (&:where(.dark, .dark *))` for class-based dark mode; sun/moon toggle button in Navbar; Leaflet popup dark overrides in `index.css`; `dark:` variants applied across all pages, components, and shadcn/ui
- **Carbon offset**: `calculateHaversineDistance` × 0.12 kg CO₂/km, rendered in VolunteerPortfolio as eco-savings
- **Certificate**: Printable gold-bordered "Certificate of Impact" with confetti celebration (`canvas-confetti` npm package). Modal has `role="dialog"`, `aria-modal="true"`, `aria-label="Certificate of Impact"`, and programmatic close button.
- **Photo upload**: Camera capture (`capture: environment`), local preview via `URL.createObjectURL`, upload to `participation-photos` Supabase Storage bucket. Preview image uses `w-full h-auto object-contain` for dynamic sizing. `compressImage` reads `file.arrayBuffer()` first (fresh Blob), falls back to data URL, then original file — non-fatal on failure. Upload button has `aria-label`.
- **Skill overlap**: `skillOverlapScore(required, volunteer)` in `utils/geo.ts` — returns percentage (0–100)
- **Testing**: 148 tests across 13 files (112 backend + 36 frontend) — Vitest + Supertest + happy-dom + @testing-library/react. Backend vitest config: `src/**/*.test.ts`, `services/**/*.test.ts`, `middleware/**/*.test.ts`, `controllers/**/*.test.ts`. See `docs/reviews/test-strategy-refined.md`.
- **Tool recommendations**: `docs/tool-recommendations.md` — curated OSS tools (Pino, pg-boss, Biome, Sonner, Lucide, OpenObserve) with integration guides.
- **sonner** — toast notifications (5 pages + Toaster in App.tsx)
- **No icon library** — inline SVGs in `components/NavIcons.tsx` (12 icons), all with `aria-hidden="true"` by default in base `Icon` component
- **Accessibility**: Labels use `htmlFor`/`id` pairing throughout. `inputMode` and `autoComplete` on all form fields. Loading spinners have `role="status"`. Toggle buttons use `aria-pressed`. Decorative SVGs are `aria-hidden="true"`.
- **Mobile responsiveness**: All grids responsive via `sm:`/`lg:` breakpoints. Mobile drawer has backdrop dismiss + Escape key. Form inputs have `inputMode` attributes for correct mobile keyboard.
- **date-fns** — used in frontend only; removed from backend as unused dependency
- **No external state library** — React Context + hooks only
- **Pino logging** — request middleware logs method/path/status/duration; auth failures log context; error handler logs request context. Zero additional dependencies.
- **Type checking**: use `tsc --build --noEmit` (root `tsconfig.json` uses `"files": []` with project references, so plain `tsc --noEmit` is a no-op). `tsconfig.app.json` has `baseUrl` with `ignoreDeprecations: "6.0"` (deprecated in TS 6, will be removed in TS 7)
- **Weather**: `utils/weather.tsx` exports `WeatherIcon`, `getWeatherDescription`, `getWeatherAdvisory`, `WeatherForecast` (extracted from GigDetail.tsx)
- **Vite proxy**: `/api` → `localhost:3001` in dev
- **`@/` path alias**: configured in `tsconfig.app.json` and `vite.config.ts`
- **PWA**: auto-update with registration; OSM tiles cached (CacheFirst, 200 max, 30 days)
- **Home stats**: dynamically fetched from Supabase (total hours, open gigs, NGO count via direct queries)
- **Duplicate join**: backend returns 409; frontend handles in `JoinGig` with try/catch
- **OSRM profiles**: uses `walking`, `cycling`, `driving` (not `foot`, `bicycle`, `car`)
- **GEarth radius**: 6371km used in haversine formula (`utils/geo.ts`)
- **CSP**: `img-src` includes `blob:` (photo previews) and `https://*.supabase.co` (storage URLs); `connect-src` includes `http://localhost:3001` for direct backend fetch
- **`@hookform/resolvers`**: pinned to `^4.1.3` — v5 dist incorrectly requires `zod/v4/core`
- **Corporate Dashboard**: `/corporate/dashboard` route — `getOrgAnalytics` aggregates hours by department/month, top-20 recent activities, CSV export; Recharts `BarChart` + `AreaChart`; stats cards (total hours, active/total members, completed gigs)
- **Organization Manage**: `/corporate/manage` route — admin panel; lists members with role/department/opt-in status; add-member form with UUID + department fields; sequential fetch (`/my-org` first, then `/members` only if admin)
- **Opt-in toggle**: `VolunteerPortfolio.tsx` shows org name and opt-in switch; controls data visibility in company analytics
- **`requireTables()` helper**: `organizationService.ts` catches `PGRST202` errors from missing tables and throws 503 with a clear message instead of generic 500
- **`apiFetch` fallback**: `utils/api.ts` tries `http://localhost:3001` direct first, falls back to Vite proxy — avoids proxy issues in dev
- **Migration bootstrap**: `backend/scripts/applyMigration.ts` attempts direct DB + pooler connections to auto-apply migrations; returns clear instructions when unreachable

### Backend
- **Auth middleware**: `verifyJwt` checks Bearer token via `supabaseAdmin.auth.getUser()`, then fetches role from `profiles` table
- **Email**: `emailService.ts` uses native `fetch` to POST to EmailJS API (not `@emailjs/node`); gracefully skips if env vars not configured
- **Global error handler**: catches `ZodError` (400), Supabase errors with `PGRST`/`235` prefix (400), everything else (500). Error messages are user-safe (Supabase internals logged server-side, not sent to client).
- **Duplicate join detection**: first checks via `select`, then catches `23505` unique constraint violation as fallback
- **Karma award**: `hours * 10` awarded on participation completion; tries `award_karma` RPC first (fast path), falls back to read-then-write direct update on `profiles` table when RPC unavailable. **Write order: karma awarded before participation status updated** — prevents inconsistent state if karma award fails.
- **Feature gig**: sets `featured_until` column; `nearby_gigs` RPC sorts featured (future) gigs first
- **Nodemon**: was an unused devDependency; dev script uses `tsx watch --import dotenv/config index.ts` (ESM hoists imports before `dotenv.config()` runs); removed from package.json
- **pino-pretty**: devDependency only (not deployed to production)
- **Zod validation**: `gig_date` validated as parseable date, `lat`/`lng` range-checked (-90/90, -180/180), photo URLs validated with `.url()`

### Cleanup History
- **4 Responsive* components** deleted (broken encoding): `ResponsiveForm.tsx`, `ResponsiveMapView.tsx`, `ResponsiveNavbar.tsx`, `ResponsiveLayout.tsx`
- **Removed unused deps**: `jsonwebtoken`, `@types/jsonwebtoken`, `nodemon` (backend); `@emailjs/browser`, `lucide-react` (frontend); `date-fns` (backend)
- **Removed dead code**: unused `supabaseAdmin` import in `emailService.ts`, unused `useDefault` callback in `useLocationPicker.ts`, redundant `dotenv.config()` in `supabase.ts`, duplicate ZodError check in `index.ts`, dead CSS classes (`glass-panel`, `mobile-nav-open`), dead UI components (`Separator`, `TabsContent`, `CardHeader`/`CardTitle`/`CardDescription`/`CardFooter`), unused `gigStatus.ts` constants, stale `_apply_mig*.mjs` scripts
- **Removed stale migration files**: `20240523000000_initial_schema.sql` (obsolete combined file, missing columns), `fix_matching_functions.sql` (band-aid), `fix_postgis_functions.sql` (outdated), `05_update_gig.sql` (superseded)
- **Extracted weather logic**: from GigDetail.tsx into `utils/weather.tsx` (WeatherIcon, getWeatherDescription, getWeatherAdvisory, WeatherForecast) — reduces GigDetail by ~85 lines
- **CSP fix**: added `blob:` and `https://*.supabase.co` to `img-src` directive so photo upload previews and storage URLs are not blocked
- **Photo upload dynamic sizing**: removed `min-h-[120px]` and `max-h-32 object-cover`, replaced with `w-full h-auto object-contain` — container adjusts to photo's natural aspect ratio
- **awardKarma fallback**: replaced RPC-only approach with RPC fast path + read-then-write direct update fallback (eliminates migration dependency)
- **compressImage refactor**: reads `file.arrayBuffer()` to create fresh Blob before compression; non-fatal 3-layer fallback (blob URL → data URL → original file)
- **@hookform/resolvers**: pinned to `^4.1.3` (v5's built dist incorrectly requires zod/v4/core)
- **tsconfig.app.json**: added `ignoreDeprecations: "6.0"` for deprecated `baseUrl`
- **Backend dev script**: changed to `tsx watch --import dotenv/config index.ts` for ESM import hoisting issue
- **AuthContext useCallback fix**: wrapped `fetchProfile`, `refreshProfile`, `signUp`, `signIn`, `signOut` in `useCallback` so context value `useMemo` stabilizes references — prevents cascading re-renders across all auth consumers
- **Matching service cleanup**: removed dead `gigData` query (fetched `ngo_id`, never used); removed redundant 2nd RPC call in fallback (the same RPC that just failed was called again); fallback now goes straight to all-profiles scoring
- **Participation write-order fix**: award karma before updating participation status (was: status set first, karma award failure left DB inconsistent)
- **Supabase error leak fix**: 8 call sites now log full error server-side and throw user-safe messages instead of raw Supabase/PG error text
- **NgoGigCard stale state fix**: edit form syncs local state when `gig` prop changes via `useEffect` (was: `useState` never re-initialized)
- **Zod validation improvements**: `gig_date` validated as parseable date via `refine`; `lat`/`lng` range-checked; photo URLs validated with `.url()` instead of `.string().min(1)`
- **ErrorBoundary added**: route-level `ErrorBoundary` wrapping `<Routes>` in `App.tsx` — component crashes show fallback UI with retry button instead of white screen
- **Mobile responsiveness**: `NgoGigCard` edit form grid changed to `grid-cols-1 sm:grid-cols-3`; Navbar mobile drawer has backdrop overlay + `Escape` key listener; `inputMode` and `autoComplete` added to all form fields
- **Accessibility pass**: programmatic labels (`htmlFor`/`id`) on 6 inputs; keyboard nav on notification items; `role="dialog"`/`aria-modal` on certificate modal; `aria-hidden="true"` on decorative SVGs; `role="status"` on PageLoader; `aria-pressed` on toggle buttons; `aria-label` on photo upload button and certificate close button
- **Request logging**: per-request logger (method, path, status, duration); auth failure logging; error handler request context — zero new dependencies
- **Environment audit**: removed unused `DATABASE_URL` from `.env.example`; documented in `docs/reviews/environment-audit.md` (0 critical/high, 1 medium, 3 low findings)
- **Deployment simplification**: deleted Dockerfiles, docker-compose, nginx.conf, Caddyfile, CI/CD workflow, deploy/backup scripts. `docs/deployment.md` covers Vercel + Render + Supabase only.
- **lucide-react replaced**: 12 icons replaced with inline SVGs in `NavIcons.tsx` — 1700 fewer modules transformed at build
- **Avatar component refactored**: replaced initials text fallback with SVG user silhouette icon; `fallback` prop removed. DiceBear initials SVG URL passed as `src` across all 4 avatar usages (VolunteerPortfolio, NgoDashboard, Leaderboard, PublicPortfolio) — consistent avatar generation from user names with graceful SVG icon fallback.
- **Installed `@types/ws`** (backend devDep) — fixes pre-existing TS7016 error from `@supabase/realtime-js` transitive dependency. `tsc` now clean on both backend and frontend.
- **Installed `@types/canvas-confetti`** (frontend devDep) — fixes missing declaration errors in ParticipateGig and VolunteerPortfolio.
- **Frontend tsc cleanup**: fixed 22 pre-existing strict-mode errors across 9 files — `global` declarations in test files, removed unused imports (Tooltip, React, Skeleton), wrapped Supabase `.then()` chains in `Promise.resolve()` to enable `.catch()`, fixed Recharts formatter parameter type, fixed `useRef` initial values in NgoDashboard, added intermediate `unknown` cast in VolunteerPortfolio.
- **Corporate dashboard MVP**: added `10_corporate_dashboard.sql` migration (`organizations` + `organization_members` tables), `organizationService.ts`/`controller`/`routes`, `CorporateDashboard.tsx` (stats + Recharts charts + CSV export), `OrganizationManage.tsx` (admin member management), `VolunteerPortfolio.tsx` org info + opt-in toggle, Navbar links, NavIcons.tsx (Building2Icon, UsersIcon, ClockIcon), CSP update for localhost backend, `apiFetch` fallback logic (direct backend first, then proxy)
- **Migration bootstrap script**: `backend/scripts/applyMigration.ts` tries direct DB + pooler connections across 4 regions + IPv6; falls back to clear manual instructions
- **Missing table graceful degradation**: `organizationService.ts` `requireTables()` helper catches `PGRST202` errors and returns 503 instead of 500
- **organizationService test fix**: thenable chain mock fixed with `c: any` cast — 13 tests now pass
- **`@types/pg` installed** (backend devDep) — fixes TS7016 for `applyMigration.ts`

### Migrations
- **Order**: `00_schema_core.sql` → `01_functions_and_realtime.sql` → `02_featured_gigs.sql` → `storage_policies.sql` → `03_atomic_karma.sql` → `04_analytics_optimization.sql` → `06_location_label.sql` → `07_fix_location_drift.sql` → `08_drop_match_volunteers_for_gig.sql` → `09_payments.sql` → `10_corporate_dashboard.sql`
- Stale/obsolete migrations deleted: `20240523000000_initial_schema.sql`, `fix_matching_functions.sql`, `fix_postgis_functions.sql`, `05_update_gig.sql`

## 🔴 Security: .env.example MUST use placeholder values only
Never put real Supabase keys in `.env.example` — they get committed to git.
Current `.env.example` files have been sanitized, but the leaked keys must be **rotated** in Supabase dashboard.
See `docs/recommendations.md` for full audit and priority list.

## Project Governance (docs/)

Local project memory for all architecture decisions, reviews, bugs, refactors, flows, and deployment context.

```
docs/
├── INDEX.md             # Master table of contents
├── architecture/        # System architecture, data models, component diagrams
├── decisions/           # ADRs — what was decided and why (MADR template)
├── reviews/             # Code review records, audit reports
├── bugs/                # Bug reports with reproduction, root cause, fix
├── refactors/           # Refactoring plans, before/after, migration notes
├── flows/               # Data flows, process workflows, state machines
└── deployment/          # Runbooks, environment configs, operational guides
```

**Rules:**
- Every significant decision, bug, review, or refactor gets a file in the appropriate folder.
- AI must check these docs before proposing changes to understand prior context.
- AI must update these docs after completing any change (add ADR, bug resolution, review record).
- Conventions and templates are defined in each folder's `INDEX.md`.
