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
│   ├── routes/               # gigs.ts, participations.ts
│   ├── controllers/          # gigController.ts, participationController.ts
│   ├── middleware/
│   │   ├── auth.ts           # verifyJwt + requireRole (Supabase Auth)
│   │   ├── validate.ts       # Zod body validation
│   │   └── asyncHandler.ts   # Async error wrapper for Express
│   ├── services/
│   │   ├── supabase.ts       # service_role admin client
│   │   ├── matchingService.ts # 0.5*proximity + 0.5*skill, 3-tier fallback
│   │   └── emailService.ts   # EmailJS REST via native fetch
│   └── dist/                 # Compiled JS
├── frontend/                 # React SPA (port 5173)
│   └── src/
│       ├── App.tsx            # 11 routes + AuthProvider + Navbar
│       ├── pages/             # Home, Login, Signup, VolunteerMap, GigDetail,
│       │                      #   ParticipateGig, NgoDashboard, CreateGig,
│       │                      #   VolunteerPortfolio, PublicPortfolio,
│       │                      #   Leaderboard
│       ├── components/
│       │   ├── ui/            # 10 shadcn/ui components: Button, Card, Badge,
│       │   │                  #   Input, Avatar, Progress, Skeleton, Separator,
│       │   │                  #   Tabs, Chart (cn() from lib/utils)
│       │   ├── NotificationBell.tsx # In-app notification dropdown (realtime)
│       │   ├── MapView.tsx    # Leaflet + OSRM routing + cluster markers
│       │   ├── LocationPicker.tsx
│       │   ├── PlaceSearch.tsx # Photon geocoding w/ debounce
│       │   ├── GigCard.tsx    # Volunteer-facing discovery card
│       │   ├── NgoGigCard.tsx # NGO management w/ inline edit + status
│       │   ├── DashboardCard.tsx
│       │   ├── AnalyticsCharts.tsx # Recharts bar/area
│       │   ├── Certificate.tsx # Printable gold-bordered certificate
│       │   ├── PhotoUpload.tsx # Camera capture + local preview
│       │   ├── Navbar.tsx
│       │   └── ProtectedRoute.tsx # Role-based route guard
│       ├── context/           # AuthContext.tsx
│       ├── hooks/             # useGeolocation, useLocationPicker,
│       │                      #   useRealtimeGigs, useRealtimeParticipations,
│       │                      #   useRealtimeNotifications
│       ├── services/          # gigs.ts, geocoding.ts, storage.ts
│       ├── types/             # database.ts (TS types + DB namespace)
│       ├── lib/               # supabase.ts, utils.ts (tailwind-merge + clsx)
│       └── utils/             # api.ts, geo.ts, gigStatus.ts
├── supabase/migrations/      # 7 SQL files
│   ├── 00_schema_core.sql
│   ├── 01_functions_and_realtime.sql
│   ├── 02_featured_gigs.sql
│   ├── 20240523000000_initial_schema.sql  # Combined (lacks featured_until)
│   ├── fix_matching_functions.sql
│   ├── fix_postgis_functions.sql
│   └── storage_policies.sql
├── render.yaml               # Backend deploy (Render)
├── vercel.json               # Frontend deploy (Vercel)
└── .env.example
```

## Roles & Routing (11 pages)
- **Volunteer**: `/map` (discovery), `/portfolio`, `/gigs/:id`, `/gigs/:id/participate`, `/leaderboard`
- **NGO**: `/ngo/dashboard`, `/ngo/create-gig`, `/leaderboard`
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

**Data flow**: Frontend uses Supabase anon client for reads (RPCs, direct queries). Backend uses service_role client for writes. REST API calls inject JWT via `utils/api.ts`.

## Backend Exports Reference

### Controllers
- **gigController.ts**: `createGigSchema` (Zod), `featureGigSchema` (Zod), `createGig`, `getNgoAnalytics`, `featureGig`, `triggerMatching`
- **participationController.ts**: `completeGigSchema` (Zod), `joinGig`, `completeParticipation`

### Middleware
- **auth.ts**: `AuthRequest` (interface), `verifyJwt`, `requireRole(...roles)`
- **validate.ts**: `validateBody<T>(schema)`
- **asyncHandler.ts**: `asyncHandler(fn)` — wraps async Express handlers

### Services
- **supabase.ts**: `supabaseAdmin` (service_role SupabaseClient)
- **matchingService.ts**: `MatchedVolunteer` (interface), `findMatchedVolunteers(gigId, radius?, limit?)`, `notifyMatchedVolunteers(gigId, volunteers, gigTitle)`
- **emailService.ts**: `sendEmail(params)`, `sendGigMatchEmails(volunteers, gigTitle)`, `sendCompletionEmail(email, name, gigTitle)`

## Database (PostgreSQL + PostGIS)
**Custom enums**: `user_role` (volunteer, ngo), `gig_status` (open, in_progress, completed, cancelled), `participation_status` (pending, joined, checked_in, completed, cancelled)

**Core tables**: `profiles` (id, role, skills[], location GEOGRAPHY, karma_points, streak, portfolio_slug, bio), `gigs` (id, ngo_id, location GEOGRAPHY, required_skills[], volunteers_needed, volunteers_joined, gig_date, status, featured_until), `participations` (id, volunteer_id, gig_id, status, before/after_photo_url, hours), `notifications` (id, user_id, message, read_status, gig_id).

**Key RPCs**: `nearby_gigs(lat, lng, radius_meters)` — returns featured first, then by distance; `insert_gig(...)`, `update_profile_location(lat, lng)`, `match_volunteers_for_gig(gig_id, radius)`, `nearby_volunteers_for_gig(gig_id, radius)`.

**Triggers**: auto-create profile on signup (`handle_new_user`), auto-update `updated_at` (`set_updated_at`), increment `volunteers_joined` on participation insert (`increment_gig_volunteers`).

**Realtime**: `gigs`, `participations`, `notifications` published to `supabase_realtime`.

**RLS**: 13 policies across all 4 tables + 4 storage policies on `participation-photos` bucket.

## Matching Algorithm (`matchingService.ts`)
```
final_score = 0.5 * proximityScore + 0.5 * skillOverlap
```
**Fallback chain** (3 tiers):
1. `match_volunteers_for_gig` RPC (primary — ordered by distance)
2. `nearby_volunteers_for_gig` RPC (if primary fails)
3. All volunteer profiles with fixed 5000m distance (last resort)

**Notifications**: `notifyMatchedVolunteers` inserts into `notifications` table; `sendGigMatchEmails` calls EmailJS via `fetch`.

## Key Architecture Notes

### Frontend
- **Auth state**: AuthContext listens to `onAuthStateChange`; `signUp` passes role/skills via `user_metadata`
- **Map center**: DEFAULT_CENTER = Delhi (28.6139, 77.209), NOT Lucknow. Lucknow RDSO preset = (26.8193, 80.8853) exported as `PRESET_LUCKNOW_RDSO` from `useLocationPicker.ts`. Map zoom = 13.
- **shadcn/ui**: 10 components in `src/components/ui/` — import via `@/components/ui/button`
- **Location**: Use `useLocationPicker()` hook which wraps `useGeolocation()` for GPS; supports GPS, preset, manual coords, search (Photon), and map click sources
- **Realtime**: `useRealtimeGigs(ngoId?)` for gig subscriptions; `useRealtimeParticipations(gigId?)` for participation count updates on GigDetail; `useRealtimeNotifications(userId?)` subscribes to `notifications` channel
- **Marker clustering**: `react-leaflet-cluster` (v4.1.3) wraps `<Marker>` children in `<MarkerClusterGroup>` — `chunkedLoading`, `maxClusterRadius=60`, `disableClusteringAtZoom=16`; CSS imported from `leaflet.markercluster/dist/`
- **NotificationBell**: `lucide-react` `Bell` icon in Navbar for all auth'd users; dropdown with unread count, mark read, mark all read, link to gig
- **Leaderboard**: `/leaderboard` route — `SELECT name, karma_points, streak FROM profiles WHERE role='volunteer' ORDER BY karma_points DESC LIMIT 50`; Recharts `BarChart` (horizontal, top 10); medals for top 3
- **Best Match sort**: `sortMode` state in `VolunteerMap.tsx` toggles between `'nearest'` (RPC default) and `'best_match'` (client-side reorder via `skillOverlapScore`) — disabled when profile has no skills
- **Add to Calendar**: ICS generator button on GigDetail — 3h default duration, GeoJSON/EWKT location parsed via `parseGigLocation`, Blob download
- **NgoGigCard location edit**: `parseGigLocation()` helper in view mode; lat/lng number inputs in edit mode; `updateGigDetails()` builds GeoJSON `{type:"Point", coordinates:[lng,lat]}` payload
- **Carbon offset**: `calculateHaversineDistance` × 0.12 kg CO₂/km, rendered in VolunteerPortfolio as eco-savings
- **Certificate**: Printable gold-bordered "Certificate of Impact" with confetti celebration (`canvas-confetti` via dynamic CDN import)
- **Photo upload**: Camera capture (`capture: environment`), local preview via `URL.createObjectURL`, upload to `participation-photos` Supabase Storage bucket
- **Skill overlap**: `skillOverlapScore(required, volunteer)` in `utils/geo.ts` — returns percentage (0–100)
- **No testing framework** configured
- **No external state library** — React Context + hooks only
- **Vite proxy**: `/api` → `localhost:3001` in dev
- **`@/` path alias**: configured in `tsconfig.app.json` and `vite.config.ts`
- **PWA**: auto-update with registration; OSM tiles cached (CacheFirst, 200 max, 30 days)
- **Home stats**: dynamically fetched from Supabase (total hours, open gigs, NGO count via direct queries)
- **Duplicate join**: backend returns 409; frontend handles in `JoinGig` with try/catch
- **OSRM profiles**: uses `walking`, `cycling`, `driving` (not `foot`, `bicycle`, `car`)
- **GEarth radius**: 6371km used in haversine formula (`utils/geo.ts`)

### Backend
- **Auth middleware**: `verifyJwt` checks Bearer token via `supabaseAdmin.auth.getUser()`, then fetches role from `profiles` table; `jsonwebtoken` package is imported but NEVER called (dead code)
- **Email**: `emailService.ts` uses native `fetch` to POST to EmailJS API (not `@emailjs/node`); gracefully skips if env vars not configured
- **Global error handler**: catches `ZodError` (400), Supabase errors with `PGRST`/`235` prefix (400), everything else (500)
- **Duplicate join detection**: first checks via `select`, then catches `23505` unique constraint violation as fallback
- **Karma award**: `hours * 10` awarded on participation completion
- **Feature gig**: sets `featured_until` column; `nearby_gigs` RPC sorts featured (future) gigs first
- **Nodemon discrepancy**: `nodemon` is a devDependency but unused; dev script uses `tsx watch index.ts` instead

### Corrupted / Unused Files
- **4 Responsive* components** exist but are BROKEN (encoding corruption, non-functional): `ResponsiveForm.tsx`, `ResponsiveMapView.tsx`, `ResponsiveNavbar.tsx`, `ResponsiveLayout.tsx` — do not import or use
- **`jsonwebtoken`** (backend) and **`@emailjs/browser`** (frontend) are unused dependencies

### Migrations
- **Migration order**: `00_schema_core.sql` → `01_functions_and_realtime.sql` → `02_featured_gigs.sql` → `storage_policies.sql`
- **Combined file**: `20240523000000_initial_schema.sql` merges 00+01 but lacks `featured_until` from 02
- **Fix scripts**: `fix_matching_functions.sql` (missing matching RPCs), `fix_postgis_functions.sql` (missing geometry type in search path)
