# KarmaMap

> A hyper-local, real-time PWA connecting local NGOs with nearby volunteers using PostGIS geospatial queries, smart proximity+skill matching, OSRM road routing, and verified impact portfolios.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript 6, Vite 6, Tailwind CSS v4, shadcn/ui |
| Backend | Node.js + Express 4 + TypeScript (ESM) |
| Database | Supabase (PostgreSQL + PostGIS), service_role key for backend |
| Mapping | React-Leaflet, OpenStreetMap tiles, OSRM routing, Photon geocoding |
| Weather | Open-Meteo API |
| Email | EmailJS |
| PWA | vite-plugin-pwa (Workbox, OSM tile caching) |
| Auth | Supabase Auth (JWT) |
| Charts | Recharts |

---

## Features

### Volunteer
- **Discovery Map** — Browse open gigs within configurable radius (10–100 km) with GPS, search, or map-tap location
- **OSRM Road Routing** — Walk/cycle/drive routes with travel times and CO₂ savings overlay
- **Weather Planner** — Open-Meteo forecast for gig date with smart advisories
- **Skill Matching** — Badge showing overlap between your skills and gig requirements
- **Impact Portfolio** — Track karma points, streaks, hours; edit bio and skills inline with tag-based editor
- **Certificates** — Printable impact certificates with gold border design, confetti celebration
- **Public Portfolio** — Shareable `/p/:slug` page with verified impact log

### NGO
- **Dashboard** — Analytics (hours, completed gigs), charts, gig management with search/filter
- **Gig Publisher** — Create gigs with map pin placement, required skills, date/time with min-date constraint
- **Smart Matching** — Algorithm scores volunteers 50% by proximity, 50% by skill overlap; automated email notifications
- **Photo Verification** — Before/after photo upload pipeline for completion validation

---

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
│       ├── pages/             # 11 route pages
│       ├── components/        # Reusable components
│       │   ├── ui/            # shadcn/ui (Button, Card, Badge, Input)
│       │   └── ...            # MapView, LocationPicker, GigCard, Certificate, etc.
│       ├── context/           # AuthContext.tsx
│       ├── hooks/             # useGeolocation, useLocationPicker, useRealtimeGigs
│       ├── services/          # gigs.ts, geocoding.ts, storage.ts
│       ├── types/             # database.ts
│       ├── lib/               # supabase.ts, utils.ts (cn helper)
│       └── utils/             # api.ts, geo.ts, gigStatus.ts
├── supabase/migrations/      # SQL migrations (schema, functions, RLS, storage)
├── render.yaml               # Backend deploy (Render)
├── vercel.json               # Frontend deploy (Vercel)
└── .env.example
```

---

## Development Setup

### 1. Supabase
1. Create a Supabase project, enable **PostGIS** extension.
2. Run migrations in order: `00_schema_core.sql`, `01_functions_and_realtime.sql`.
3. Create `participation-photos` storage bucket, apply `storage_policies.sql`.
4. Enable Email auth provider.

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

## Architecture Notes
- **Data flow**: Frontend reads via Supabase anon client (RPCs, direct queries). Backend writes via service_role client. REST API calls inject JWT via `utils/api.ts`.
- **Matching algorithm** (`matchingService.ts`): `0.5 * proximityScore + 0.5 * skillOverlap`
- **Auth middleware**: `verifyJwt` + `requireRole(...roles)` using Supabase Auth.
- **No testing framework** — React Context + hooks only for state.
- **Vite proxy**: `/api` -> `localhost:3001` in dev.
- **Map center**: Lucknow, India (26.8467, 80.9462), zoom 12.

---

## License
MIT
