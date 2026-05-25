# Deployment

## Stack

| Layer | Host | Cost |
|---|---|---|
| Frontend (React SPA) | Vercel | Free |
| Backend (Express API) | Render | Free (spins down after 15 min idle) |
| Database | Supabase | Free tier (500MB, PostGIS) |
| Email (optional) | EmailJS | Free (200/mo) |

## Frontend — Vercel

1. Push to GitHub
2. In Vercel dashboard: **Add New Project** → Import your repo
3. Set **Root Directory** to `frontend/`
4. Set **Build Command** to `npm run build`
5. Set **Output Directory** to `dist`
6. Add env vars:
   - `VITE_SUPABASE_URL` — your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` — your Supabase anon key
   - `VITE_API_URL` — your Render backend URL (e.g. `https://karmamap-api.onrender.com`)
7. Deploy

Vercel detects `vercel.json` automatically (SPA rewrites configured). No further config needed.

## Backend — Render

1. Push to GitHub
2. In Render dashboard: **New Web Service** → Connect your repo
3. Set **Root Directory** to `backend`
4. Set **Build Command** to `npm install`
5. Set **Start Command** to `npm run build && node dist/index.js`
6. Set **Health Check Path** to `/health`
7. Add env vars:
   - `SUPABASE_URL` — your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY` — your Supabase service_role key (secret — never commit)
   - `FRONTEND_URL` — your Vercel app URL (e.g. `https://karmamap.vercel.app`)
   - `EMAILJS_PUBLIC_KEY` — (optional) EmailJS public key
   - `EMAILJS_SERVICE_ID` — (optional) EmailJS service ID
   - `EMAILJS_TEMPLATE_ID` — (optional) EmailJS template ID
   - `NODE_ENV` — `production`
8. Deploy

**Cold start**: Render's free tier spins down after 15 min idle. First request after idle takes 5–15s. Upgrade to $7/mo starter plan for always-on.

## Database — Supabase

1. Create project at [supabase.com](https://supabase.com)
2. Enable PostGIS: SQL Editor → `CREATE EXTENSION IF NOT EXISTS postgis;`
3. Create `participation-photos` storage bucket
4. Run migrations in order from `supabase/migrations/`
5. Copy `Project URL`, `anon key`, and `service_role key` for the env vars above

## Migrations

Run each file in order via the Supabase SQL Editor:

```
00_schema_core.sql
01_functions_and_realtime.sql
02_featured_gigs.sql
storage_policies.sql
03_atomic_karma.sql
04_analytics_optimization.sql
06_location_label.sql
07_fix_location_drift.sql
08_drop_match_volunteers_for_gig.sql
```

## Environment Variables

### Backend (Render dashboard)

| Variable | Required | Description |
|---|---|---|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | service_role key |
| `FRONTEND_URL` | Yes | Your Vercel app URL |
| `NODE_ENV` | Yes | Set to `production` |
| `EMAILJS_PUBLIC_KEY` | No | EmailJS public key |
| `EMAILJS_SERVICE_ID` | No | EmailJS service ID |
| `EMAILJS_TEMPLATE_ID` | No | EmailJS template ID |

### Frontend (Vercel dashboard)

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `VITE_API_URL` | Yes | Backend URL (e.g. `https://karmamap-api.onrender.com`) |

## Upgrading to Hetzner (Docker)

When you outgrow Render:

```dockerfile
# backend/Dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN npm run build
USER node
EXPOSE 3001
CMD ["node", "dist/index.js"]
```

Run on Hetzner:

```bash
docker build -f backend/Dockerfile -t karmamap-api .
docker run -d --restart unless-stopped -p 3001:3001 --env-file .env karmamap-api
```

## Logging

Logs are structured JSON via Pino. View in Render dashboard (Live Logs tab) or tail via Render CLI:

```bash
render logs --tail
```

## Monitoring

- **Health check**: Render pings `/health` every 5 min (keeps the free tier warm-ish)
- **Errors**: Use the Render dashboard to filter error-level log lines
- **Uptime**: [Uptime Kuma](https://uptime.kuma.pet/) (free) against your Render and Vercel URLs

## Failure Points

| Failure | Symptom | Mitigation |
|---|---|---|
| Supabase outage | Auth fails, reads fail | Client shows error message |
| EmailJS down | Match emails don't send | In-app notifications still work |
| OSRM tile server down | Map shows no tiles | Leaflet falls back to OSM |
| Render free tier spin-down | Slow first request after idle | Upgrade to $7/mo starter plan |
