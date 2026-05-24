# KarmaMap — AI Agent Context

## Overview
A hyper-local, real-time PWA connecting local NGOs with nearby volunteers. Uses PostGIS geospatial queries, smart proximity+skill matching, OSRM road routing, and verified impact portfolios.

## Tech Stack
| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript 6, Vite 6, Tailwind CSS v4, **shadcn/ui** |
| Backend | Node.js + Express 4 + TypeScript (ESM) |
| Database | Supabase (PostgreSQL + PostGIS), service_role key for backend |
| Mapping | React-Leaflet, OpenStreetMap tiles, OSRM routing, Photon geocoding |
| Weather | Open-Meteo API |
| Email | EmailJS |
| PWA | vite-plugin-pwa (Workbox, OSM tile caching) |
| Auth | Supabase Auth (JWT) |
| Charts | Recharts |

## Project Structure
```
KarmaMap/
├── backend/                  # Express REST API (port 3001)
│   ├── index.ts              # Entry point
│   ├── routes/               # gigs.ts, participations.ts
│   ├── controllers/          # gigController.ts, participationController.ts
│   ├── middleware/            # auth.ts (JWT+role), validate.ts (Zod)
│   ├── services/             # supabase.ts, matchingService.ts, emailService.ts
│   └── dist/                 # Compiled JS
├── frontend/                 # React SPA (port 5173)
│   └── src/
│       ├── App.tsx            # Router + layout
│       ├── pages/             # 11 route pages (Home, Login, Signup, VolunteerMap, GigDetail, ParticipateGig, NgoDashboard, CreateGig, VolunteerPortfolio, PublicPortfolio)
│       ├── components/        # MapView, LocationPicker, PlaceSearch, GigCard, NgoGigCard, DashboardCard, AnalyticsCharts, Certificate, PhotoUpload, Navbar, ProtectedRoute
│       │   └── ui/            # shadcn/ui (Button, Card, Badge, Input — cn() from lib/utils)
│       ├── context/           # AuthContext.tsx
│       ├── hooks/             # useGeolocation, useLocationPicker, useRealtimeGigs
│       ├── services/          # gigs.ts, geocoding.ts, storage.ts
│       ├── types/             # database.ts (TS types)
│       ├── lib/               # supabase.ts, utils.ts (tailwind-merge + clsx)
│       └── utils/             # api.ts, geo.ts, gigStatus.ts
├── supabase/migrations/      # SQL migrations (schema, functions, RLS, storage)
├── render.yaml               # Backend deploy (Render)
├── vercel.json               # Frontend deploy (Vercel)
└── .env.example
```

## Roles & Routing
- **Volunteer**: `/map` (discovery), `/portfolio`, `/gigs/:id`, `/gigs/:id/participate`
- **NGO**: `/ngo/dashboard`, `/ngo/create-gig`
- **Public**: `/` (home), `/login`, `/signup`, `/p/:slug` (public portfolio)

## API Endpoints (Express backend)
| Method | Path | Auth | Role | Description |
|---|---|---|---|---|
| GET | `/health` | — | — | Health check |
| POST | `/api/gigs` | JWT | ngo | Create gig + trigger matching |
| GET | `/api/gigs/analytics` | JWT | ngo | Dashboard analytics |
| POST | `/api/gigs/:gigId/match` | JWT | ngo | Manual re-match |
| POST | `/api/participations/join/:gigId` | JWT | volunteer | Join a gig (returns 409 if already joined) |
| PATCH | `/api/participations/:id/complete` | JWT | volunteer | Complete with photos/hours |
| PATCH | `/api/gigs/:gigId/feature` | JWT | ngo | Feature a gig for N hours (sets `featured_until`) |

**Data flow**: Frontend uses Supabase anon client for reads (RPCs, direct queries). Backend uses service_role client for writes. REST API calls inject JWT via `utils/api.ts`.

## Database (PostgreSQL + PostGIS)
**Core tables**: `profiles` (id, role, skills[], location GEOGRAPHY, karma_points, portfolio_slug), `gigs` (id, ngo_id, location GEOGRAPHY, required_skills[], volunteers_needed, volunteers_joined, status), `participations` (id, volunteer_id, gig_id, status, before/after_photo_url, hours), `notifications` (id, user_id, message, read_status).

**Key RPCs**: `nearby_gigs(lat, lng, radius_meters)`, `insert_gig(...)`, `update_profile_location(lat, lng)`, `match_volunteers_for_gig(gig_id, radius)`.

**Triggers**: auto-create profile on signup, auto-update `updated_at`, increment `volunteers_joined` on participation insert.

**Realtime**: `gigs`, `participations`, `notifications` published to `supabase_realtime`.

## Key Architecture Notes
- **Matching algorithm** (backend `matchingService.ts`): `0.5 * proximityScore + 0.5 * skillOverlap`
- **Auth middleware**: `verifyJwt` (checks Bearer token via Supabase Auth) + `requireRole(...roles)`
- **Frontend auth state**: AuthContext listens to `onAuthStateChange`
- **shadcn/ui**: Button, Card, Badge, Input in `src/components/ui/` — import via `@/components/ui/button`
- **No testing framework** configured
- **No external state library** — React Context + hooks only
- **Vite proxy**: `/api` -> `localhost:3001` in dev
- **`@/` path alias**: configured in `tsconfig.app.json` and `vite.config.ts`
- **Map zoom** defaults to 12, centered on Lucknow India (26.8467, 80.9462)
- **PWA**: auto-update with registration; OSM tiles cached (CacheFirst, 200 max, 30 days)
- **Home stats**: dynamically fetched from Supabase (total hours, open gigs, NGO count)
- **Duplicate join**: backend returns 409 with "You have already joined this gig."
- **OSRM profiles**: uses `walking`, `cycling`, `driving` (not `foot`, `bicycle`, `car`)
