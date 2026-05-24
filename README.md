# KarmaMap

> A hyper-local, real-time PWA connecting local NGOs with nearby volunteers using PostGIS geospatial queries, smart proximity+skill matching, OSRM road routing, and verified impact portfolios.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript 6, Vite 6, Tailwind CSS v4, shadcn/ui |
| Backend | Node.js + Express 4 + TypeScript (ESM) |
| Database | Supabase (PostgreSQL + PostGIS), service_role key for backend |
| Mapping | React-Leaflet + react-leaflet-cluster, OpenStreetMap tiles, OSRM routing, Photon geocoding |
| Weather | Open-Meteo API (free, no key) |
| Email | EmailJS (REST API via `fetch`) |
| PWA | vite-plugin-pwa (Workbox, OSM tile caching) |
| Auth | Supabase Auth (JWT, onAuthStateChange) |
| Charts | Recharts (BarChart, AreaChart) |

---

## Features

### Volunteer
- **Discovery Map** — Browse open gigs within configurable radius (10–100 km) with GPS, search, or map-tap location; auto-clustering for dense areas
- **Smart Recommendations** — Toggle between "Nearest" and "Best Match" sort (skill overlap reordering)
- **OSRM Road Routing** — Walk/cycle/drive routes with travel times and CO₂ savings overlay with glow-effect polylines
- **Weather Planner** — Open-Meteo forecast for gig date with smart advisory banners
- **Skill Matching** — Percentage badge showing overlap between your skills and gig requirements
- **In-App Notifications** — Bell icon with unread count, realtime dropdown for match alerts and updates
- **Add to Calendar** — One-click .ics download for gig dates
- **Leaderboard** — Karma point rankings with Recharts bar chart, top-50 volunteer standings
- **Impact Portfolio** — Karma points, streak, hours, eco-savings (haversine-based carbon offset), inline editable bio/skills, shareable slug
- **Certificates** — Printable "Certificate of Impact" with gold border design, confetti celebration on completion
- **Public Portfolio** — Shareable `/p/:slug` page with verified impact timeline
- **Photo Verification** — Before/after photo upload with camera capture + local preview

### NGO
- **Dashboard** — Analytics (total hours, completed gigs, total hosted), bar/area charts, gig management with search/filter/tabs
- **Gig Publisher** — Create gigs with interactive map pin placement, required skills tag editor, date/time with min-date constraint
- **Smart Matching** — Algorithm scores volunteers 50% by proximity, 50% by skill overlap; automated email + in-app notifications
- **Gig Management** — Inline editing (including lat/lng location), status transitions (open → in_progress → completed / cancelled), feature/unfeature for boosted visibility
- **Photo Verification** — Volunteers upload before/after photos for completion validation

---

## Routes (10 pages)

| Path | Page | Access |
|---|---|---|
| `/` | Home (landing) | Public |
| `/login` | Login | Public |
| `/signup` | Signup (role toggle) | Public |
| `/p/:slug` | Public Portfolio | Public |
| `/map` | Volunteer Map (discovery) | Volunteer |
| `/portfolio` | Volunteer Portfolio | Volunteer |
| `/gigs/:id` | Gig Detail | Public |
| `/gigs/:id/participate` | Participate / Complete Gig | Volunteer |
| `/leaderboard` | Volunteer Leaderboard | Auth'd |
| `/ngo/dashboard` | NGO Dashboard | NGO |
| `/ngo/create-gig` | Create Gig | NGO |

---

## Project Structure

```
KarmaMap/
├── backend/                    # Express REST API (port 3001)
│   ├── index.ts                # Entry point, CORS, error handler
│   ├── routes/
│   │   ├── gigs.ts             # 4 NGO endpoints
│   │   └── participations.ts   # 2 volunteer endpoints
│   ├── controllers/
│   │   ├── gigController.ts             # create, analytics, feature, matching
│   │   └── participationController.ts   # join (409 on duplicate), complete
│   ├── middleware/
│   │   ├── auth.ts             # verifyJwt + requireRole (Supabase Auth)
│   │   ├── validate.ts         # Zod body validation
│   │   └── asyncHandler.ts     # Async error wrapper
│   ├── services/
│   │   ├── supabase.ts         # service_role admin client
│   │   ├── matchingService.ts  # 0.5*proximity + 0.5*skill, 3-tier fallback
│   │   └── emailService.ts     # EmailJS REST via fetch
│   └── dist/                   # Compiled JS
├── frontend/                   # React SPA (port 5173)
│   └── src/
│       ├── App.tsx             # 11 routes + AuthProvider + Navbar
│       ├── pages/              # 12 pages (Home, Login, Signup, VolunteerMap,
│       │                       #   GigDetail, ParticipateGig, NgoDashboard,
│       │                       #   CreateGig, VolunteerPortfolio, PublicPortfolio,
│       │                       #   Leaderboard)
│       ├── components/
│       │   ├── ui/             # 10 shadcn/ui (Button, Card, Badge, Input,
│       │   │                   #   Avatar, Progress, Skeleton, Separator,
│       │   │                   #   Tabs, Chart)
│       │   ├── NotificationBell.tsx # In-app notification dropdown (realtime)
│       │   ├── MapView.tsx     # Leaflet map + OSRM routing + cluster markers
│       │   ├── LocationPicker.tsx
│       │   ├── PlaceSearch.tsx # Photon geocoding
│       │   ├── GigCard.tsx     # Volunteer-facing card
│       │   ├── NgoGigCard.tsx  # NGO management w/ inline edit + location
│       │   ├── DashboardCard.tsx
│       │   ├── AnalyticsCharts.tsx # Recharts bar/area
│       │   ├── Certificate.tsx     # Printable impact certificate
│       │   ├── PhotoUpload.tsx
│       │   ├── Navbar.tsx
│       │   └── ProtectedRoute.tsx
│       ├── context/            # AuthContext.tsx
│       ├── hooks/              # useGeolocation, useLocationPicker,
│       │                       #   useRealtimeGigs, useRealtimeParticipations,
│       │                       #   useRealtimeNotifications
│       ├── services/           # gigs.ts, geocoding.ts, storage.ts
│       ├── types/              # database.ts (TS types + DB namespace)
│       ├── lib/                # supabase.ts, utils.ts (cn)
│       └── utils/              # api.ts, geo.ts, gigStatus.ts
├── supabase/migrations/        # 7 SQL files (schema, RPCs, RLS, storage)
├── render.yaml                 # Backend deploy (Render, Node 20)
├── vercel.json                 # Frontend deploy (Vercel, SPA rewrites)
└── .env.example
```

---

## API Endpoints (Express backend)

| Method | Path | Auth | Role | Description |
|---|---|---|---|---|
| GET | `/health` | — | — | Health check |
| POST | `/api/gigs` | JWT | ngo | Create gig + trigger matching + email |
| GET | `/api/gigs/analytics` | JWT | ngo | Dashboard analytics (hours, charts) |
| POST | `/api/gigs/:gigId/match` | JWT | ngo | Manual re-match + notify |
| PATCH | `/api/gigs/:gigId/feature` | JWT | ngo | Feature gig for N hours |
| POST | `/api/participations/join/:gigId` | JWT | volunteer | Join gig (409 if duplicate) |
| PATCH | `/api/participations/:participationId/complete` | JWT | volunteer | Complete with photos/hours + award karma |

---

## Data Flow

- **Reads**: Frontend uses Supabase anon client (RPCs, direct `select` queries)
- **Writes**: Backend uses `service_role` client; REST API calls inject JWT via `utils/api.ts`
- **Realtime**: `gigs`, `participations`, `notifications` published to `supabase_realtime`; `useRealtimeNotifications(userId)` hook for live notification updates
- **Marker clustering**: `react-leaflet-cluster` wraps `<Marker>` children in `<MarkerClusterGroup>` — auto-clusters at zoom < 16, `maxClusterRadius=60`
- **Leaderboard**: `/leaderboard` route queries `profiles WHERE role=volunteer ORDER BY karma_points DESC LIMIT 50`; Recharts horizontal bar chart for top 10
- **Best Match sort**: Toggle on VolunteerMap re-sorts gigg via `skillOverlapScore()` — fallback to distance on tie
- **NotificationBell**: Lucide `Bell` icon + unread count badge; dropdown lists notifications from `notifications` table; `markRead` / `markAllRead` support
- **Add to Calendar**: Inline .ics generator on GigDetail — 3-hour default duration, GeoJSON/EWKT location parsing
- **Auth**: `AuthContext` listens to `onAuthStateChange`; backend verifies via `supabaseAdmin.auth.getUser()`

---

## Matching Algorithm (`matchingService.ts`)

```
final_score = 0.5 * proximityScore + 0.5 * skillOverlap
```

**Fallback chain** (3 tiers):
1. `match_volunteers_for_gig` RPC (primary)
2. `nearby_volunteers_for_gig` RPC (fallback)
3. All profiles with fixed 5000m distance (last resort)

**Notifications**: `notifyMatchedVolunteers()` inserts into `notifications` table; `sendGigMatchEmails()` calls EmailJS API.

---

## Database (PostgreSQL + PostGIS)

**Core tables**: `profiles`, `gigs`, `participations`, `notifications`
**Custom enums**: `user_role`, `gig_status`, `participation_status`
**GEOGRAPHY columns**: `profiles.location`, `gigs.location` (SRID 4326)
**Key RPCs**: `nearby_gigs`, `insert_gig`, `update_profile_location`, `match_volunteers_for_gig`, `nearby_volunteers_for_gig`
**Triggers**: auto-profile on signup, auto-update `updated_at`, increment `volunteers_joined`

**Migration order**:
1. Enable PostGIS in Supabase Dashboard
2. Create `participation-photos` storage bucket (Public: ON)
3. `00_schema_core.sql` — tables, enums, RLS, `nearby_gigs`
4. `01_functions_and_realtime.sql` — helper RPCs + realtime publish
5. `02_featured_gigs.sql` — `featured_until` column + sort order
6. `storage_policies.sql` — storage bucket RLS

Or use the combined `20240523000000_initial_schema.sql` (steps 3–5 combined — lacks `featured_until`).

---

## Development Setup

### Prerequisites
- Node.js 20+
- Supabase project (free tier) with **PostGIS** enabled

### 1. Supabase Setup
1. Create project, enable **PostGIS** extension
2. Run migrations in order above
3. Enable Email auth provider
4. Create `participation-photos` storage bucket (Public)

### 2. Frontend
```bash
cd frontend
cp .env.example .env
# Fill in VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

### 3. Backend
```bash
cd backend
cp .env.example .env
# Fill in PORT, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, EmailJS vars
npm install
npm run dev
```

---

## Deployment

### Frontend (Vercel)
- `vercel.json` configures build, output dir, SPA rewrites
- Set env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL`

### Backend (Render)
- `render.yaml` configures Node 20, build/start commands
- Set env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `FRONTEND_URL`, EmailJS vars

---

## Architecture Notes

- **Vite proxy**: `/api` → `localhost:3001` in dev
- **`@/` path alias**: configured in `tsconfig.app.json` + `vite.config.ts`
- **Map center**: Defaults to Delhi (28.6139, 77.209); Lucknow RDSO preset (26.8193, 80.8853); zoom 13
- **PWA**: auto-update with registration; OSM tiles cached (CacheFirst, 200 max, 30 days)
- **Dark mode**: `ThemeContext` with `ThemeProvider` wrapping app; reads `localStorage('karmamap-theme')` with system `prefers-color-scheme` fallback; toggles `dark` class on `<html>`; Tailwind v4 `@custom-variant dark` for class-based dark mode; sun/moon toggle button in Navbar; Leaflet popup dark overrides in `index.css`; `dark:` variants applied across all pages, components, and shadcn/ui
- **OSRM profiles**: `walking`, `cycling`, `driving`
- **Carbon offset**: Haversine distance × 0.12 kg CO₂/km estimate
- **Duplicate join**: Backend returns 409 `"You have already joined this gig."`
- **Unused deps**: `jsonwebtoken` installed but never called (Supabase Auth handles verification); `@emailjs/browser` in frontend deps but unused

---

## License

MIT
