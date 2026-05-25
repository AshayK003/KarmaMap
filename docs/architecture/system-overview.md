# KarmaMap — System Overview

**Date:** 2026-05-25
**Status:** Baseline snapshot (refinement phase)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser (PWA)                        │
│  React 19 + TypeScript 6 + Vite 6 + Tailwind v4 + shadcn/ui │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌────────────┐  ┌──────────┐  │
│  │  Pages   │  │  Hooks   │  │ Components │  │ Services │  │
│  └──────────┘  └──────────┘  └────────────┘  └──────────┘  │
│         │             │             │              │        │
│         └─────────────┴─────────────┴──────────────┘        │
│                            │                                 │
│              ┌─────────────┴──────────────┐                  │
│              │     AuthContext (JWT)       │                  │
│              └─────────────┬──────────────┘                  │
└────────────────────────────┼────────────────────────────────┘
                             │
              ┌──────────────┴───────────────┐
              │  Vite Dev Proxy (/api → 3001) │
              └──────────────┬───────────────┘
                             │
┌────────────────────────────┼─────────────────────────────────┐
│                    Express 4 Backend (port 3001)              │
│                                                              │
│  ┌─────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │ Routes  │  │ Controllers   │  │ Services               │  │
│  │ gigs.ts │  │ gigController  │  │ gigService             │  │
│  │ parts.ts│  │ partController │  │ participationService   │  │
│  └────┬────┘  └──────┬───────┘  │ matchingService         │  │
│       │              │           │ emailService            │  │
│       └──────────────┘           │ queue (pg-boss)         │  │
│                                 └───────────┬────────────┘  │
│                                            │                │
│  ┌──────────────────────────────────────────┘                │
│  │  Middleware: auth (JWT verify + role), validate (Zod),   │
│  │             asyncHandler, global error handler            │
│  └──────────────────────────────────────────────────────────┘
│                             │
│                 ┌───────────┴───────────┐                    │
│                 │  service_role client  │                    │
│                 └───────────┬───────────┘                    │
└─────────────────────────────┼───────────────────────────────┘
                              │
┌─────────────────────────────┼───────────────────────────────┐
│                     Supabase (PostgreSQL + PostGIS)          │
│                                                              │
│  ┌──────────┐  ┌───────────┐  ┌────────────┐  ┌──────────┐ │
│  │ Auth     │  │ Database  │  │ Realtime   │  │ Storage  │ │
│  │ (JWT)    │  │ (PostGIS) │  │ (channels) │  │ (photos) │ │
│  └──────────┘  └───────────┘  └────────────┘  └──────────┘ │
│                                                              │
│  External APIs: OSRM (routing), Open-Meteo (weather),        │
│                 Photon (geocoding), EmailJS (email)          │
└──────────────────────────────────────────────────────────────┘
```

### Tier Summary

| Tier | Technology | Hosting | Port |
|---|---|---|---|
| Frontend | React 19 + Vite 6 | Nginx (Docker) / Vercel | 80 (Docker) |
| Backend | Express 4 + TypeScript | Node 22 (Docker) / Render | 3001 |
| Database | Supabase (PostgreSQL 15 + PostGIS) | Supabase Cloud | — |
| Reverse Proxy | Caddy 2 (Docker) | Docker | 80/443 |
| Monitoring | Prometheus + Loki + Grafana (Docker) | Docker | 3000 (Grafana) |

---

## 2. Folder Structure

```
KarmaMap/
├── backend/                   # Express REST API
│   ├── index.ts               # Entry point, CORS, global error handler
│   ├── routes/                # gigs.ts, participations.ts
│   ├── controllers/           # gigController.ts, participationController.ts
│   ├── middleware/
│   │   ├── auth.ts            # verifyJwt + requireRole
│   │   ├── validate.ts        # Zod body validation
│   │   └── asyncHandler.ts    # Async error wrapper
│   ├── services/
│   │   ├── supabase.ts        # service_role client
│   │   ├── matchingService.ts # proximity(0.5) + skill(0.5) scoring
│   │   ├── emailService.ts    # EmailJS REST via fetch
│   │   ├── gigService.ts      # CRUD + analytics + matching orchestration
│   │   ├── participationService.ts # join, complete, award karma
│   │   ├── queue.ts           # pg-boss job queue (optional)
│   │   ├── src/lib/logger.ts  # pino structured logger
│   │   └── src/lib/cache.ts   # In-memory cache (TTL 30s)
│   ├── __tests__/             # api.test.ts (HTTP integration)
│   ├── services/__tests__/    # Unit tests for all services
│   └── package.json
│
├── frontend/                  # React SPA
│   └── src/
│       ├── App.tsx            # 11 routes + AuthProvider + Navbar
│       ├── pages/             # Home, Login, Signup, VolunteerMap, GigDetail,
│       │                      #   ParticipateGig, NgoDashboard, CreateGig,
│       │                      #   VolunteerPortfolio, PublicPortfolio,
│       │                      #   Leaderboard
│       ├── components/
│       │   ├── ui/            # 9 shadcn/ui: Button, Card, Badge, Input,
│       │   │                  #   Avatar, Progress, Skeleton, Tabs, Chart
│       │   ├── MapView.tsx    # Leaflet + OSRM + clusters
│       │   ├── LocationPicker.tsx
│       │   ├── PlaceSearch.tsx
│       │   ├── GigCard.tsx / NgoGigCard.tsx
│       │   ├── DashboardCard.tsx
│       │   ├── AnalyticsCharts.tsx
│       │   ├── Certificate.tsx
│       │   ├── PhotoUpload.tsx
│       │   ├── NotificationBell.tsx
│       │   ├── Navbar.tsx
│       │   └── ProtectedRoute.tsx
│       ├── context/AuthContext.tsx
│       ├── hooks/             # useGeolocation, useLocationPicker,
│       │                      #   useRealtimeGigs, useRealtimeParticipations,
│       │                      #   useRealtimeNotifications
│       ├── services/          # gigs.ts, geocoding.ts, storage.ts
│       ├── types/database.ts  # Full TS types for all DB tables
│       ├── lib/               # supabase.ts (anon client), utils.ts (cn)
│       ├── utils/             # api.ts (fetch wrapper), geo.ts (haversine)
│       └── index.css          # Tailwind + Leaflet overrides + dark mode
│
├── supabase/migrations/       # 8 SQL migration files
├── docs/                      # Project governance (see docs/INDEX.md)
├── docker-compose.yml         # Backend + Frontend + Caddy
├── docker-compose.monitoring.yml  # Prometheus + Loki + Grafana
├── Dockerfile.backend         # Node 22 multi-stage
├── Dockerfile.frontend        # Node 22 build → Nginx serve
├── nginx.conf                 # Frontend static serving
├── Caddyfile                  # TLS termination + reverse proxy
├── .github/workflows/deploy.yml  # CI/CD: test → build → push → SSH deploy
├── render.yaml                # Render deploy config (stale)
├── vercel.json                # Vercel SPA config
├── prometheus.yml / loki.yml  # Monitoring configs
└── .env.example / .env.production
```

---

## 3. Core Business Flows

### 3.1 Volunteer Discovery Flow

```
[Volunteer] → /map
  ├─ 1. Browser requests geolocation
  ├─ 2. useGeolocation hook caches to localStorage, falls back to DEFAULT_CENTER (Delhi)
  ├─ 3. VolunteerMap calls supabase.rpc('nearby_gigs', {lat, lng, radius_meters})
  │      └─ Returns gigs sorted: featured first, then by distance
  ├─ 4. Optionally re-sorts by skill overlap (best_match mode)
  ├─ 5. MapView renders: Leaflet map + MarkerClusterGroup + OSRM route
  │      └─ Click gig → route from user location (walking/cycling/driving)
  └─ 6. GigCard list in sidebar → click → /gigs/:id detail page
```

### 3.2 Gig Creation Flow (NGO)

```
[NGO] → /ngo/create-gig
  ├─ 1. Fill form: title, description, skills, volunteers_needed,
  │      location (search/GPS/map click/preset), gig_date
  ├─ 2. Zod validation (lat: -90..90, lng: -180..180, hours: 0.5-24)
  ├─ 3. POST /api/gigs (JWT + ngo role)
  │      ├─ Controller validates body, calls gigService.createGig
  │      │   ├─ Inserts gig via RPC (insert_gig)
  │      │   ├─ Enqueues matching job to pg-boss (or runs synchronously)
  │      │   ├─ findMatchedVolunteers: 3-tier fallback
  │      │   │   ├─ Tier 1: match_volunteers_for_gig RPC
  │      │   │   ├─ Tier 2: nearby_volunteers_for_gig RPC
  │      │   │   └─ Tier 3: ALL volunteers, fixed 5000m radius
  │      │   └─ notifyMatchedVolunteers + sendGigMatchEmails
  │      └─ Response: { gig, matched_count }
  └─ 4. Gig appears on /map (realtime broadcast)
```

### 3.3 Participation Flow

```
[Volunteer] → /gigs/:id/participate
  ├─ 1. POST /api/participations/join/:gigId (JWT + volunteer role)
  │      ├─ participationService.joinGig
  │      │   ├─ Checks for existing participation (409 if duplicate)
  │      │   ├─ Inserts with status 'joined'
  │      │   └─ Returns participation record
  │      └─ Response: { participation }
  ├─ 2. Volunter completes gig → takes before/after photos
  │      ├─ PhotoUpload: camera capture → local preview → Supabase Storage
  │      └─ Photo URL stored in participation record
  ├─ 3. PATCH /api/participations/:id/complete (JWT + volunteer role)
  │      ├─ participationService.completeParticipation
  │      │   ├─ Validates hours (0.5-24)
  │      │   ├─ Verifies ownership
  │      │   ├─ Updates status to 'completed'
  │      │   ├─ Calls award_karma RPC (hours * 10)
  │      │   │   └─ AwardKarma function: UPDATE karma_points, streak
  │      │   ├─ Creates notification for NGO
  │      │   └─ Sends completion email
  │      └─ Response: { participation, karma_earned }
  └─ 4. Certificate viewable with confetti celebration
```

### 3.4 Matching Algorithm Flow

```
findMatchedVolunteers(gigId, radius=5000, limit=20)

  1. Fetch gig: location (GeoJSON), required_skills, ngo_id

  2. For each volunteer (from RPC or fallback):
     score = 0.5 * proximityScore + 0.5 * skillOverlap

     proximityScore = 1 - (distance / radius)
       [clamped to 0..1]

     skillOverlap = matchedSkills / max(required.length, volunteer.length)
       [returns fraction 0..1]

  3. Sort by score descending, take top `limit`

  4. Result: Array<{ volunteer_id, name, distance_meters, skills, score }>

  Fallback chain:
    ├─ RPC match_volunteers_for_gig (primary, DB-side)
    ├─ RPC nearby_volunteers_for_gig (if primary fails)
    └─ ALL volunteers, fixed 5000m, JS scoring (last resort)
```

### 3.5 Karma Award Flow

```
completeParticipation
  ├─ 1. Validate participation ownership (volunteer_id matches JWT)
  ├─ 2. Check participation status = 'joined', hours provided
  ├─ 3. Update participation: status='completed', before/after_photo_url, hours
  ├─ 4. Award karma: RPC award_karma(user_id, hours)
  │      ├─ SELECT karma_points, streak FROM profiles
  │      ├─ karma_points += hours * 10
  │      ├─ streak += 1 (unconditional — not day-gated)
  │      └─ UPDATE profiles
  │      └─ Retry once on failure, then throw
  ├─ 5. INSERT notification for NGO: "{volunteer} completed {gig title}"
  └─ 6. Call sendCompletionEmail (native fetch → EmailJS)
```

---

## 4. Critical Dependencies

### Backend (runtime)

| Package | Version | Purpose | Risk |
|---|---|---|---|
| `express` | ^4.21.2 | HTTP framework | Low |
| `@supabase/supabase-js` | ^2.49.1 | Database client (service_role) | Low |
| `zod` | ^4.4.3 | Schema validation | **HIGH** — v4 API incompatible with v3 code patterns |
| `pg-boss` | ^10.4.2 | Job queue (optional) | Medium — unused in dev, no tests |
| `pino` | ^10.3.1 | Structured logging | Low |
| `ws` | ^8.21.0 | WebSocket for Supabase Realtime | Low — Node 22 has native WS |
| `compression` | ^1.8.1 | Gzip responses | Low |
| `cors` | ^2.8.5 | CORS middleware | Low |

### Backend (dev)

| Package | Version | Risk |
|---|---|---|
| `@types/express` | **^5.0.0** | **HIGH** — Express 5 types with Express 4 runtime |
| `vitest` | ^4.1.7 | Low |
| `tsx` | ^4.19.3 | Low |

### Frontend (runtime)

| Package | Version | Purpose | Risk |
|---|---|---|---|
| `react` / `react-dom` | ^19.2.6 | UI framework | Low |
| `react-router-dom` | ^7.15.1 | Routing | Low |
| `@supabase/supabase-js` | ^2.106.1 | Database client (anon) | Low |
| `react-leaflet` | ^5.0.0 | Map integration | Low |
| `recharts` | ^3.8.1 | Charts | Low |
| `react-hook-form` | ^7.76.0 | Form state | Low |
| `@hookform/resolvers` | ^5.4.0 | Zod integration | Medium — `as any` cast needed |
| `zod` | ^4.4.3 | Schema validation | **HIGH** — same v3/v4 mismatch |
| `date-fns` | ^4.3.0 | Date formatting | Low |
| `sonner` | ^2.0.7 | Toast notifications | Low |
| `lucide-react` | ^1.16.0 | Icons | Low — installed but barely used |
| `leaflet` | ^1.9.4 | Map rendering | Low |
| `react-leaflet-cluster` | ^4.1.3 | Marker clustering | Low |
| `clsx` / `tailwind-merge` | latest | CSS utilities | Low |
| `class-variance-authority` | ^0.7.1 | shadcn/ui | Low |

### External APIs

| API | Purpose | Dependency Risk |
|---|---|---|
| Supabase (PostgreSQL + PostGIS) | All data storage, RPCs, realtime, auth | **HIGH** — single point of failure |
| OSRM (router.project-osrm.org) | Walking/cycling/driving routes | Medium — free, rate-limited |
| Photon (photon.komoot.io) | Geocoding (place search) | Medium — free, rate-limited |
| Open-Meteo (api.open-meteo.com) | Weather forecasts | Medium — free, no API key needed |
| EmailJS | Transactional emails | Medium — graceful skip if unconfigured |
| jsDelivr CDN | canvas-confetti (dynamic import) | **HIGH** — no SRI, network-dependent |

---

## 5. Risk Areas

### 🔴 Critical (active threat)

| Risk | Impact | Notes |
|---|---|---|
| Live Supabase service_role key on disk | Full DB access if machine compromised | Must rotate in Supabase dashboard |
| Orphaned DeepSeek API key | Unused credential leak | Remove from `.env` |
| Synchronous throw at module import | App crashes at load if env vars missing | `frontend/src/lib/supabase.ts:21` |
| CDN dynamic import with `@ts-ignore` | Arbitrary code execution if CDN compromised | `ParticipateGig.tsx`, `VolunteerPortfolio.tsx` |
| ICS injection | Malformed calendar entries from malicious gig titles | `GigDetail.tsx:360` |
| Missing `SET search_path` in DB functions | Schema hijacking via search_path manipulation | `03_atomic_karma.sql`, `04_analytics_optimization.sql` |

### 🟠 High (should address before production)

| Risk | Impact | Notes |
|---|---|---|
| Auth context re-render cascade | Performance degradation with many consumers | `useCallback` missing on auth functions |
| Stale token race condition | API calls using expired tokens | Module-level `cachedToken` in `api.ts` |
| Coordinate input destroyed on keystroke | Manual coordinate entry unusable | `key` prop on inputs in `LocationPicker.tsx` |
| No error boundary | Unhandled render crash kills entire app | Missing in `App.tsx` |
| Matching service fetches all profiles | OOM on large volunteer dataset | `matchingService.ts:91` |
| Unbounded in-memory cache | Memory exhaustion under load | `cache.ts` |
| Queue startup promise unhandled | Silent failure of background jobs | `index.ts:77` |
| `volunteers_joined` overcounts | Stale/inaccurate gig capacity | No decrement on status change |
| Missing indexes on key query columns | Degraded performance as data grows | 5 tables missing critical indexes |
| `render.yaml` outdated | Deployment confusion | References unused Render service |

### 🟡 Medium

| Risk | Impact |
|---|---|
| Zod v4 vs v3 API mismatch (both packages) | Runtime failures on Zod upgrade |
| Express 5 types with Express 4 runtime | False positives/negatives from TS checks |
| Missing CSP headers | Broad XSS surface |
| No rate limiting | No DoS protection |
| N+1 auth queries (JWT verify + profile fetch) | Extra latency on every authenticated request |
| `canvas-confetti` not in package.json | Build-time invisible, runtime CDN dependency |
| `skillOverlap` duplicated frontend/backend | Algorithm skew if one side is updated without the other |
| `parseGigLocation` duplicated across 3 files | Inconsistent behavior, harder to fix |
| PWA no app shell caching | No true offline support |

---

## 6. Technical Debt Areas

### 6.1 Code Duplication

| Pattern | Locations | Lines of Duplication |
|---|---|---|
| `skillOverlap` / `skillOverlapScore` | `matchingService.ts` + `utils/geo.ts` | ~10 lines |
| `parseGigLocation` | `utils/geo.ts` + `GigDetail.tsx` + `VolunteerPortfolio.tsx` | ~15 lines each |
| `getKarmaLevel` | `PublicPortfolio.tsx` + `VolunteerPortfolio.tsx` | ~8 lines each |
| Matching pipeline (create → notify → email) | `gigService.ts:92` / `queue.ts:44` / `gigController.ts:104` | ~10 lines each |
| Param validation `if (!gigId...)` | `gigController.ts:50,72,98` | 12 lines x3 |
| Inline SVG icons | 15+ components | Varies |
| Weather advisory logic | `GigDetail.tsx` | ~50 lines, not extracted |
| Realtime subscription setup | `useRealtimeGigs.ts` + `VolunteerMap.tsx` | ~40 lines each |

### 6.2 Inconsistent Patterns

| Pattern | Problem |
|---|---|
| REST API vs direct Supabase queries | Frontend uses both for mutations — different error handling, auth paths |
| `as any` type assertions | 5+ locations bypass type safety |
| Controllers calling `supabaseAdmin` directly | `_featureGig` breaks service layer; `triggerMatching` duplicates service logic |
| `console.error` only for error handling | 12 locations with no user feedback |
| `res.status()` without `return` | `participationController.ts:39` — risks double-response |

### 6.3 Over-Engineering

| Feature | Debt | Justification |
|---|---|---|
| `pg-boss` job queue | Infra complexity + 0 test coverage | Queue disabled in dev, synchronous fallback handles production |
| `queue.ts` dynamic imports | Fragile, breaks static analysis | Fallback imports matchingService + emailService dynamically |
| `match_volunteers_for_gig` RPC | Thin wrapper adding empty `email` column | Could be simplified to direct `nearby_volunteers_for_gig` call |
| `get_ngo_analytics` ARRAY_AGG(id) | Computes but never uses gig ID array | Leftover from earlier version |
| Monitoring stack (Prometheus/Loki/Grafana) | Configured but backend has no `/metrics` endpoint | Orchestration without instrumentation |

### 6.4 Untested Code

| Module | File(s) | Coverage |
|---|---|---|
| Job queue | `queue.ts` | 0% |
| Cache | `cache.ts` | 0% |
| `updateGig` endpoint | `gigController.ts` | 0% |
| `featureGig` endpoint | `gigController.ts` | 0% |
| `triggerMatching` endpoint | `gigController.ts` | 0% |
| `completeParticipation` success | `participationService.ts` | 0% (error-only tested) |
| Global error handler | `index.ts` | 0% |
| `findMatchedVolunteers` (integration) | `matchingService.ts` | 0% |
| `participationService` (misleading) | `participationService.test.ts` | Tests non-existent fallback |

---

## 7. Deployment Flow

### CI/CD Pipeline (`.github/workflows/deploy.yml`)

```
[git push main] or [workflow_dispatch]
       │
       ▼
┌──────────────────────┐
│  Job: test           │
│  ├─ npm ci (backend) │
│  ├─ tsc --noEmit     │
│  ├─ npm ci (frontend)│
│  ├─ tsc -b --noEmit  │
│  ├─ vitest (backend) │
│  └─ vitest (frontend)│
└──────────┬───────────┘
           │ (pass)
           ▼
┌──────────────────────────────────┐
│  Job: build-and-push (needs test)│
│  ├─ Login to GHCR                │
│  ├─ Docker build + push backend  │
│  │   └─ Tags: {sha}, latest      │
│  └─ Docker build + push frontend │
│      └─ Tags: {sha}, latest      │
└──────────────┬───────────────────┘
               │
               ▼
┌───────────────────────────────────────┐
│  Job: deploy (needs build-and-push)   │
│  ├─ SSH into VPS                      │
│  ├─ git pull origin main              │
│  ├─ docker compose pull               │
│  ├─ docker compose up -d              │
│  └─ docker image prune -f             │
└───────────────────────────────────────┘
```

### Production Topology

```
                     ┌──────────┐
                     │  Client  │
                     └────┬─────┘
                          │ :443
                     ┌────▼─────┐
                     │  Caddy   │ (TLS termination)
                     │  :80/443 │
                     └──┬───┬───┘
                        │   │
               /api/*    │   │  /*
                        │   │
              ┌─────────▼┐ ┌▼──────────┐
              │ Backend  │ │ Frontend  │
              │ :3001    │ │ Nginx :80 │
              └────┬─────┘ └───────────┘
                   │
         ┌─────────┴─────────┐
         │     Supabase      │
         │  (PostgreSQL +    │
         │   PostGIS + Auth) │
         └───────────────────┘
```

### Environment Variables

| Variable | Source | Where Used |
|---|---|---|
| `SUPABASE_URL` | Backend `.env` | `index.ts` |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend `.env` | `supabase.ts` |
| `FRONTEND_URL` | Backend `.env` | CORS config |
| `EMAILJS_*` | Backend `.env` | `emailService.ts` |
| `VITE_SUPABASE_URL` | GitHub Variable | Docker build arg → Vite |
| `VITE_SUPABASE_ANON_KEY` | GitHub Secret | Docker build arg → Vite |
| `VITE_API_URL` | GitHub Variable | Docker build arg → Vite |

---

## 8. State Management

### Architecture

No external state library. Pure React Context + hooks.

```
<App>
  <ThemeProvider>          ← Dark/light mode (localStorage)
    <AuthProvider>         ← JWT session, user profile, role
                            ↓ onAuthStateChange
                            ↓ supabase.auth.getSession()
      <BrowserRouter>
        <Navbar />         ← Reads AuthContext
        <Routes>
          <ProtectedRoute> ← Reads AuthContext role
            <Page />       ← Uses hooks for local state + data fetching
                           ↓ useRealtimeGigs / useRealtimeParticipations
                           ↓ useGeolocation / useLocationPicker
          </ProtectedRoute>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </ThemeProvider>
</App>
```

### State Categories

| Category | Mechanism | Lifetime |
|---|---|---|
| Auth session | `AuthContext` (React context) | Browser session + Supabase refresh |
| User profile | `AuthContext` (cached in sessionStorage, 1 min) | Per page load |
| Theme | `ThemeContext` (React context, `localStorage`) | Persisted across sessions |
| Location | `useGeolocation` hook (localStorage cache) | Persisted across sessions |
| Realtime data | `useRealtimeGigs`, `useRealtimeParticipations`, `useRealtimeNotifications` | Component lifecycle |
| Form state | `react-hook-form` | Component lifecycle |
| UI state | Local `useState` | Component lifecycle |
| API responses | `useState` + `useEffect` fetch | Component lifecycle |

### Data Flow Patterns

**Frontend → Supabase (reads):**
```
Component → supabase.from('gigs').select() or supabase.rpc('nearby_gigs')
  └─ Uses anon client (limited RLS permissions)
```

**Frontend → Backend (writes):**
```
Component → apiFetch('/api/gigs', { method: 'POST', body })
  └─ utils/api.ts injects JWT from cachedToken → Express → service_role Supabase
```

**Realtime subscriptions:**
```
Component → supabase.channel('gigs').on('postgres_changes', handler)
  └─ Subscribe in useEffect, unsubscribe on cleanup
```

### Known State Issues

| Issue | Detail |
|---|---|
| Race condition on auth state change | Multiple `fetchProfile` calls can overwrite each other |
| Auth functions not memoized | `signUp`/`signIn`/`signOut`/`refreshProfile` recreate every render, causing context cascade |
| Module-level token subscription | `cachedToken` in `api.ts` is un-cleanable and race-prone |
| Location cache not re-read on refresh | `useGeolocation.ts:refresh()` always starts from initial state, not latest cache |
| Unbounded `profileCache` | `useRealtimeGigs.ts` ref cache grows without eviction |

---

## 9. API Interaction Map

### REST Endpoints (Express Backend)

| Method | Path | Auth | Role | Body Schema | Response |
|---|---|---|---|---|---|
| GET | `/health` | — | — | — | `{ status: 'ok' }` |
| POST | `/api/gigs` | JWT | ngo | `createGigSchema` | `{ gig, matched_count }` |
| PATCH | `/api/gigs/:gigId` | JWT | ngo | `updateGigSchema` | `{ gig }` |
| GET | `/api/gigs/analytics` | JWT | ngo | — | `{ gigsData, participationsData, chartData }` |
| POST | `/api/gigs/:gigId/match` | JWT | ngo | **None** | `{ matched_count }` |
| PATCH | `/api/gigs/:gigId/feature` | JWT | ngo | `featureGigSchema` | `{ gig }` |
| POST | `/api/participations/join/:gigId` | JWT | volunteer | **None** | `{ participation }` |
| PATCH | `/api/participations/:participationId/complete` | JWT | volunteer | `completeGigSchema` | `{ participation, karma_earned }` |

### Supabase RPCs (Reads via anon client)

| RPC | Parameters | Returns | Used By |
|---|---|---|---|
| `nearby_gigs` | `lat`, `lng`, `radius_meters` | Gigs ordered by featured + distance | `VolunteerMap.tsx` |
| `get_ngo_analytics` | `p_ngo_id` | JSON: totals, chart data | `NgoDashboard.tsx` (via backend) |
| `award_karma` | `p_user_id`, `p_hours` | Updated karma_points | Backend `participationService.ts` |

### Supabase Direct Queries (Frontend)

| Query Pattern | Used By |
|---|---|
| `from('gigs').select('*').eq('id', id)` | `GigDetail.tsx`, `ParticipateGig.tsx` |
| `from('gigs').select('*').eq('ngo_id', ngoId)` | `NgoDashboard.tsx` |
| `from('profiles').select('*').eq('id', userId)` | Multiple pages |
| `from('profiles').select('*').eq('portfolio_slug', slug)` | `PublicPortfolio.tsx` |
| `from('participations').select('*, gigs(*)').eq('volunteer_id', id)` | `VolunteerPortfolio.tsx` |
| `from('notifications').select('*').eq('user_id', id)` | `NotificationBell.tsx` |
| `from('profiles').select(...).order('karma_points', { ascending: false }).limit(50)` | `Leaderboard.tsx` |
| `from('gigs').select('*').not('featured_until', 'is', null)` | `Home.tsx` |

### Realtime Channels

| Channel | Event | Filter | Used By |
|---|---|---|---|
| `gigs` | `INSERT`/`UPDATE`/`DELETE` | Full table | `useRealtimeGigs.ts`, `VolunteerMap.tsx` |
| `participations` | `INSERT`/`UPDATE` | Full table | `useRealtimeParticipations.ts` |
| `notifications` | `INSERT` | Full table | `useRealtimeNotifications.ts` |

### External API Calls (Frontend)

| API | Endpoint | Frequency | Error handling |
|---|---|---|---|
| OSRM | `https://router.project-osrm.org/route/v1/{profile}/{origin};{destination}` | Per gig click | `console.error` + silent fallback |
| Photon | `https://photon.komoot.io/api/?q={query}&lat={}&lon={}` | Per keystroke (debounced) | `console.error` |
| Open-Meteo | `https://api.open-meteo.com/v1/forecast?latitude={}&longitude={}` | Per gig detail load | `console.error` |
| EmailJS | `https://api.emailjs.com/api/v1.0/email/send` | On match/completion | Graceful return false |
| jsDelivr | `https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/+esm` | On certificate view | `@ts-ignore` |

---

## 10. Security Concerns

### 🔴 Critical

| # | Concern | Location | Impact |
|---|---|---|---|
| 1 | Live Supabase service_role JWT on disk | `backend/.env` | Full database admin access if leaked |
| 2 | Orphaned DeepSeek API key | `backend/.env` (line 9) | Unused credential, unnecessary exposure |
| 3 | No CSP headers | `frontend/index.html` | Broad XSS surface — 7+ external domains loaded |
| 4 | CDN import without SRI | `ParticipateGig.tsx:124`, `VolunteerPortfolio.tsx:147` | Supply chain attack on canvas-confetti |
| 5 | Missing `search_path` in SECURITY DEFINER-equivalent functions | `03_atomic_karma.sql`, `04_analytics_optimization.sql` | Schema hijacking via search_path manipulation |
| 6 | Synchronous throw on missing env vars | `frontend/src/lib/supabase.ts:21` | Information disclosure via stack trace |

### 🟠 High

| # | Concern | Location | Impact |
|---|---|---|---|
| 7 | ICS injection via gig title/description | `GigDetail.tsx:360` | Malformed calendar data |
| 8 | Storage SELECT policy too permissive | `storage_policies.sql:8` | Any auth user can view any photo |
| 9 | No rate limiting on API | Backend (no middleware) | Brute force / DoS |
| 10 | No Helmet security headers | Backend (no middleware) | Missing XSS/X-Frame/MIME-sniffing protections |
| 11 | `cors: true` in dev mode | `backend/index.ts:22` | Reflects any origin in development |
| 12 | Auth middleware errors not logged | `auth.ts:36` | Silent auth failures hinder incident response |

### 🟡 Medium

| # | Concern | Location | Impact |
|---|---|---|---|
| 13 | Module-level `cachedToken` subscription | `api.ts:11` | Cannot be cleaned up, race-prone |
| 14 | `@ts-ignore` on dynamic imports | 3 locations | Suppresses type safety for external code |
| 15 | `as any` casts on zodResolver | 3 form pages | Bypasses type checking for form data |
| 16 | Unvalidated Realtime payloads | Multiple `as Gig` casts | Malformed data propagates silently |
| 17 | Express 5 types with Express 4 | `package.json` | Potential type safety gaps |
| 18 | No request ID / correlation ID | Backend (no middleware) | Difficult log tracing |
| 19 | Print CSS hides `.grid` | `index.css:49-113` | Breaks layout when printing |
| 20 | `handle_new_user` accepts user-controlled role | `00_schema_core.sql:85` | Enum cast mitigates but risk if new roles added |

### 🟢 Low

| # | Concern | Location |
|---|---|---|
| 21 | `res.status()` without `return` | `participationController.ts:39` |
| 22 | Profile `location` typed as `unknown` | `types/database.ts:17` |
| 23 | No `sr-only` labels on interactive elements | `MapView.tsx`, `LocationPicker.tsx`, `NgoGigCard.tsx` |
| 24 | `capture="environment"` forces rear camera | `PhotoUpload.tsx:102` |
| 25 | `api.ts` error parsing chain fragile | `api.ts:40-58` |

### Security Recommendations (Priority)

1. **Rotate all credentials** — Supabase service_role key, remove orphaned DeepSeek key
2. **Add CSP headers** — via Caddy or meta tag in `index.html`
3. **Replace CDN confetti** — install `canvas-confetti` via npm, remove dynamic import
4. **Add `SET search_path`** to `award_karma` and `get_ngo_analytics` functions
5. **Add rate limiting** — `express-rate-limit` middleware
6. **Add Helmet** — security headers middleware
7. **Add logging to auth catch blocks** — so failures are traceable
8. **Add runtime validation** for Realtime payload boundaries (Zod at the hook level)
9. **Fix storage SELECT policy** — restrict to completed participations
10. **Add input sanitization** for ICS generation

---

*Baseline snapshot captured at project refinement phase. All observations are current as of 2026-05-25.*
