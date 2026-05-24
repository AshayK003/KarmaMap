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
- **No testing framework** — not yet configured. Controllers are thin wrappers; business logic lives in services for future unit testing.
- **No icon library** — all icons are inline SVGs. Zero cost to add a new icon.
- **No external state library** — plain React Context + hooks.

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

Three-tier fallback (`matchingService.ts`):
1. `match_volunteers_for_gig` RPC (PostGIS distance sort)
2. `nearby_volunteers_for_gig` RPC (fallback)
3. All profiles at fixed 5000m (last resort)

Notifications: in-app (`notifications` table) + email (EmailJS via `fetch`).

## Testing

No testing framework is configured. To add tests:
- **Unit tests**: Services (`services/*.ts`) are the right boundary — pure business logic, no Express dependency
- **Integration tests**: Hit REST endpoints with a test Supabase project
- **E2E tests**: Playwright or Cypress against the full stack

## Migrations

Run in `supabase/migrations/` in this exact order:

```
00_schema_core.sql              → tables, enums, RLS, nearby_gigs RPC
01_functions_and_realtime.sql   → helper RPCs + realtime publication
02_featured_gigs.sql            → featured_until column + sort order
storage_policies.sql            → storage bucket RLS policies
03_atomic_karma.sql             → award_karma function (optional; fallback exists)
```

Fix scripts (run if matching fails):
- `fix_matching_functions.sql` — recreates matching RPCs
- `fix_postgis_functions.sql` — fixes geometry type search path

Combined file `20240523000000_initial_schema.sql` merges steps 1–3 but **lacks** `featured_until`.

## Deployment

### Frontend (Vercel)

- `vercel.json` configures build, output dir, SPA rewrites
- Set env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL`

### Backend (Render)

- `render.yaml` defines Node 20 service, build/start commands
- Set env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `FRONTEND_URL`, EmailJS vars

## Common Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `"You have already joined this gig."` (409) | Duplicate participation | Each volunteer can join a gig once |
| Matching returns empty | PostGIS not enabled or RPCs missing | Run `fix_matching_functions.sql` |
| Emails not sending | EmailJS env vars missing | Skip is safe — in-app notifications still work |
| Map tiles not loading | PWA cache or CORS | OSM tiles are cached with CacheFirst (200 max, 30d) |
| Auth session lost on refresh | Token expiry | Supabase handles refresh automatically via `onAuthStateChange` |
| `ZodError` (400) on API | Invalid request body | Check schema — backend validates with zod v4 |

## Contributing

- **Branch from `main`**, PR back to `main`
- Run `npm run build` in both projects before committing — the build must pass
- No testing framework exists yet; any contribution that adds tests is doubly welcome
- Business logic goes in `services/`, not controllers
- All icons are inline SVGs — don't add an icon library
- No external state library — React Context + hooks is the pattern
- Keep the dependency graph small — prefer the standard library
- Update `AGENTS.md` when adding or changing files — it's the AI context reference
