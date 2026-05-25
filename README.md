# KarmaMap

Hyper-local, real-time PWA connecting NGOs with nearby volunteers. Uses PostGIS geospatial queries for proximity matching, OSRM for road routing, and a weighted skill+location algorithm to rank volunteers.

## Architecture

```
┌────────────────────────────────────────────────────┐
│  Frontend (React SPA, port 5173)                    │
│  ┌──────────┐  ┌─────────┐  ┌───────────────────┐  │
│  │ Supabase  │  │ REST    │  │ Recharts, Leaflet │  │
│  │ anon reads│  │ API     │  │ (charts, maps)    │  │
│  └──────────┘  └──┬──────┘  └───────────────────┘  │
└───────────────────┼────────────────────────────────┘
                    │ POST/PATCH (JWT)
┌───────────────────┼────────────────────────────────┐
│  Backend (Express, port 3001)                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │ Routes   │→ │Controllers│→ │ Services         │  │
│  └──────────┘  └──────────┘  │ (gig,            │  │
│                               │  participation,  │  │
│                               │  matching, email) │  │
│                               └────────┬─────────┘  │
│                                        │              │
│                          ┌─────────────┴────────────┐ │
│                          │ Supabase service_role     │ │
│                          └──────────────────────────┘ │
└────────────────────────────────────────────────────┘
```

**Key design decisions**:
- **Reads via anon client** — the frontend queries Supabase directly for reads (RPCs, `SELECT`). Only writes go through the backend.
- **Backend uses `service_role` key** — bypasses RLS for writes. Never expose this key to the client.
- **Testing** — Vitest + Supertest for backend API tests; Vitest for frontend. Business logic lives in services for unit testability.
- **No icon library** — all icons are inline SVGs. Zero cost to add a new icon.
- **Avatars** — DiceBear initials SVG API generates avatars from user names. Falls back to a user silhouette icon on load failure.
- **No external state library** — plain React Context + hooks.
- **Graceful fallbacks** — matching, email, and karma award all degrade gracefully when their dependencies (RPC functions, EmailJS, migrations) are unavailable.

## Prerequisites

- Node.js 20+
- Supabase project (free tier) with **PostGIS** extension enabled
- (Optional) EmailJS account for email notifications

## Setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Enable **PostGIS** extension in the SQL editor:
   ```sql
   CREATE EXTENSION IF NOT EXISTS postgis;
   ```
3. Create a public storage bucket named `participation-photos`
4. Enable the **Email** auth provider (Settings → Authentication → Providers)
5. Run migrations in order (see [Migrations](#migrations))
6. Copy your project URL, anon key, and service_role key

### 2. Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev   # starts on port 3001 with hot reload via tsx
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev   # starts on port 5173, proxies /api → localhost:3001
```

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | Server port (default 3001) |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | `service_role` key (secret — never commit) |
| `FRONTEND_URL` | No | CORS origin (default `http://localhost:5173`) |
| `EMAILJS_PUBLIC_KEY` | No | EmailJS public key (skip = emails disabled) |
| `EMAILJS_SERVICE_ID` | No | EmailJS service ID |
| `EMAILJS_TEMPLATE_ID` | No | EmailJS template ID |

### Frontend (`frontend/.env`)

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `VITE_API_URL` | No | Backend URL (default `/api`, proxied in dev) |

## Local Development Flow

```
npm run dev (frontend:5173)  ──proxy──→  npm run dev (backend:3001)
                                                │
                                          Supabase (service_role)
```

1. Start the backend first (`cd backend && npm run dev`)
2. Start the frontend (`cd frontend && npm run dev`)
3. Open `http://localhost:5173`
4. Sign up as either **volunteer** or **NGO** to test role-specific flows

**Build for production**:
```bash
cd backend && npm run build   # → dist/
cd frontend && npm run build  # → dist/ (static SPA)
```

## Routes

| Path | Page | Access |
|---|---|---|
| `/` | Home landing | Public |
| `/login` | Login | Public |
| `/signup` | Signup (role toggle) | Public |
| `/p/:slug` | Public Portfolio | Public |
| `/map` | Discovery Map | Volunteer |
| `/portfolio` | My Portfolio | Volunteer |
| `/gigs/:id` | Gig Detail | Public |
| `/gigs/:id/participate` | Participate/Complete | Volunteer |
| `/leaderboard` | Leaderboard | Auth'd |
| `/ngo/dashboard` | NGO Dashboard | NGO |
| `/ngo/create-gig` | Create Gig | NGO |

## API Endpoints

| Method | Path | Auth | Role | Description |
|---|---|---|---|---|
| GET | `/health` | — | — | Health check |
| POST | `/api/gigs` | JWT | ngo | Create gig + trigger matching |
| GET | `/api/gigs/analytics` | JWT | ngo | Dashboard analytics |
| POST | `/api/gigs/:gigId/match` | JWT | ngo | Manual re-match |
| PATCH | `/api/gigs/:gigId/feature` | JWT | ngo | Feature gig (N hours) |
| POST | `/api/participations/join/:gigId` | JWT | volunteer | Join gig (409 on dup) |
| PATCH | `/api/participations/:id/complete` | JWT | volunteer | Complete + award karma |

**Data flow**: Frontend calls REST API via `utils/api.ts` which injects the Supabase JWT into the `Authorization: Bearer` header.

## Matching Algorithm

```
final_score = 0.5 × proximityScore + 0.5 × skillOverlap
```

Two-tier fallback (`matchingService.ts`):
1. `nearby_volunteers_for_gig` RPC (PostGIS proximity + skill scoring)
2. All profiles scored at fixed 5000m (last resort — no redundant RPC retry)

Notifications: in-app (`notifications` table) + email (EmailJS via `fetch`).

## Testing

Tests use **Vitest** with **Supertest** for API integration tests. Run from either directory:

```bash
cd backend   && npx vitest run
cd frontend  && npx vitest run
```

148 tests across 13 files. See `docs/reviews/test-strategy-refined.md` for the full test plan.

## Migrations

Run in `supabase/migrations/` in this exact order:

```
00_schema_core.sql              → tables, enums, RLS, nearby_gigs RPC
01_functions_and_realtime.sql   → helper RPCs + realtime publication
02_featured_gigs.sql            → featured_until column + sort order
storage_policies.sql            → storage bucket RLS policies
03_atomic_karma.sql             → award_karma function
04_analytics_optimization.sql   → aggregated analytics RPC
06_location_label.sql           → location_label support
07_fix_location_drift.sql       → conditional update_gic location fix
08_drop_match_volunteers_for_gig.sql → remove dead wrapper RPC
```

Stale/obsolete migration files have been removed: `20240523000000_initial_schema.sql`, `fix_matching_functions.sql`, `fix_postgis_functions.sql`, `05_update_gig.sql`.

## Deployment

### Frontend (Vercel)

- `vercel.json` configures build, output dir, SPA rewrites
- Set env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL`

### Backend

- `docker-compose up backend` (recommended) or deploy manually
- Set env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `FRONTEND_URL`, EmailJS vars

## Common Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `"You have already joined this gig."` (409) | Duplicate participation | Each volunteer can join a gig once |
| Matching returns empty | PostGIS not enabled or RPCs missing | Run missing migration files |
| `award_karma` function not found | Migration `03_atomic_karma.sql` not applied | Run the migration, or the backend falls back to direct update automatically |
| Emails not sending | EmailJS env vars missing | Skip is safe — in-app notifications still work |
| Map tiles not loading | PWA cache or CORS | OSM tiles are cached with CacheFirst (200 max, 30d) |
| Auth session lost on refresh | Token expiry | Supabase handles refresh automatically via `onAuthStateChange` |
| `ZodError` (400) on API | Invalid request body | Check schema — backend validates with zod v4 |

## Contributing

- **Branch from `main`**, PR back to `main`
- Run `npm run build` in both projects before committing — the build must pass
- Run `npx vitest run` in both projects; add tests for new code
- Business logic goes in `services/`, not controllers
- All icons are inline SVGs — don't add an icon library
- No external state library — React Context + hooks is the pattern
- Keep the dependency graph small — prefer the standard library
- Update `AGENTS.md` when adding or changing files — it's the AI context reference
