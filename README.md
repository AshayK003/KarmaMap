# KarmaMap

Hyper-local volunteer and skill-matching PWA. Connects NGOs with nearby volunteers using PostGIS geospatial matching, real-time Supabase updates, verified photo uploads, and karma tracking.

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | React, Vite, Tailwind CSS, PWA |
| Backend | Node.js, Express |
| Database | Supabase (Postgres + PostGIS) |
| Maps | Leaflet, OpenStreetMap |
| Email | EmailJS |
| Hosting | Vercel (frontend), Render (backend) |

## Project structure

```
frontend/          React PWA
backend/           Express REST API
supabase/migrations/   Database schema, RLS, PostGIS
```

## Setup

### 1. Supabase

Run SQL files **in this order** in the SQL Editor:

1. Enable **postgis** under Database → Extensions.
2. `supabase/migrations/00_schema_core.sql` — tables, RLS, `nearby_gigs`.
3. `supabase/migrations/01_functions_and_realtime.sql` — backend functions + realtime.
4. **Storage** → New bucket `participation-photos` (public) → run `storage_policies.sql`.
5. Enable **Email** auth under Authentication → Providers.

Optional fix scripts (only if a step failed): `fix_postgis_functions.sql`, `fix_matching_functions.sql`.

Alternatively run the combined `20240523000000_initial_schema.sql` if starting fresh.

Copy **Project URL** and **anon key** (frontend); **service role key** (backend only).

### 2. Frontend

```bash
cd frontend
cp .env.example .env
# Fill VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_API_URL
npm install
npm run dev
```

### 3. Backend

```bash
cd backend
cp .env.example .env
# Fill SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, EmailJS vars
npm install
npm run dev
```

API runs at `http://localhost:3001`. Vite proxies `/api` in development.

### 4. EmailJS

Create templates with variables: `to_email`, `to_name`, `subject`, `message`, `gig_title`.

## MVP workflow

1. **NGO** signs up → creates a gig at their location.
2. Backend runs **smart matching** (50% distance + 50% skill overlap).
3. Top volunteers get **in-app notifications** and **EmailJS** emails.
4. **Volunteer** discovers gigs on the map → joins → uploads before/after photos.
5. **Realtime** updates NGO dashboard volunteer counts.
6. Volunteer **completes** gig → earns karma + **certificate**.
7. NGO **exports analytics** via browser print/PDF.

## Deployment

### Vercel (frontend)

- Root directory: `frontend` (or use root `vercel.json`)
- Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL` (Render API URL)

### Render (backend)

- Use `render.yaml` or create a Web Service from `backend/`
- Set `FRONTEND_URL` to your Vercel domain for CORS
- Never expose `SUPABASE_SERVICE_ROLE_KEY` in the frontend

## Security

- Row Level Security enabled on all tables
- NGOs manage only their gigs; volunteers edit only their participations
- Service role key used **only** on the backend
- User roles stored in `profiles` table (updated on signup)

## License

MIT
