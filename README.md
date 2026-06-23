# KarmaMap

**Hyper-local volunteer & skill-matching platform connecting NGOs with nearby volunteers.**

KarmaMap is a production-grade PWA that bridges the gap between NGOs needing skilled help and volunteers looking for meaningful local impact. It uses PostGIS geospatial matching, real-time updates, and a karma-based incentive system to make volunteering accessible, trackable, and rewarding.

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=fff)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express-4-000?logo=express)](https://expressjs.com/)
[![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?logo=supabase&logoColor=fff)](https://supabase.com/)
[![PostGIS](https://img.shields.io/badge/PostGIS-316192?logo=postgresql&logoColor=fff)](https://postgis.net/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=fff)](https://vite.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

---

## Features

- **🗺️ Proximity Matching** — PostGIS-powered geospatial queries find volunteers within range of NGO gigs, ranked by a weighted skill + location algorithm.
- **🛣️ Real Routing** — OSRM road distance scores complement straight-line proximity for realistic volunteer availability.
- **📊 Role-Based Dashboards** — Separate views for volunteers, NGOs, and corporate partners — each with analytics, history, and management tools.
- **🏆 Karma System** — Earn karma points and build streaks for completed participation. Leaderboard fosters community recognition.
- **📱 PWA Ready** — Works offline, installable on mobile. Built with React + Vite for fast interactions.
- **🔐 Row-Level Security** — Supabase RLS protects reads; the Express backend handles writes via `service_role` key (never exposed to the client).
- **📸 Verified Photo Uploads** — Volunteers submit completion photos to a dedicated Supabase storage bucket for accountability.
- **📧 Email Notifications** — Optional EmailJS integration for participation confirmations and updates.
- **📍 Public Portfolios** — Volunteers get shareable profile pages (`/p/:slug`) showcasing their impact.
- **🏢 Corporate CSR Tools** — Organizations can track team participation, manage members, and generate CSR analytics.

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 19, TypeScript, Vite, React Router 7, Tailwind CSS, Leaflet, Recharts |
| **Backend** | Express 4, TypeScript, Zod validation, Pino logging, Rate limiting |
| **Database** | Supabase (PostgreSQL + PostGIS), Row-Level Security |
| **Maps & Geo** | Leaflet, react-leaflet, OSRM routing, PostGIS geography |
| **Auth** | Supabase Auth (email/password) |
| **Testing** | Vitest, Supertest |
| **Linting** | Biome |
| **Infra** | Docker, Vercel, supabase/migrations |

## Architecture Overview

```
┌──────────────────────────────────────────────────────┐
│                   Frontend (React SPA)                │
│  ┌──────────┐   ┌─────────┐   ┌──────────────────┐  │
│  │ Supabase  │   │ REST    │   │ Recharts, Leaflet │  │
│  │ anon reads│   │ API     │   │ (charts, maps)    │  │
│  └──────────┘   └──┬──────┘   └──────────────────┘  │
└─────────────────────┼────────────────────────────────┘
                      │ POST/PATCH (JWT)
┌─────────────────────┼────────────────────────────────┐
│           Backend (Express, port 3001)                │
│  ┌──────────┐  ┌────────────┐  ┌──────────────────┐  │
│  │ Routes   │→ │Controllers  │→ │ Services          │  │
│  └──────────┘  └────────────┘  │ (matching, gig,    │  │
│                                │  participation,     │  │
│                                │  email, karma)      │  │
│                                └────────┬──────────┘  │
│                                         │              │
│                           ┌─────────────┴───────────┐ │
│                           │  Supabase service_role   │ │
│                           │  (writes — never client) │ │
│                           └─────────────────────────┘ │
└───────────────────────────────────────────────────────┘
```

**Key decisions:**
- **Reads via anon client** — Frontend queries Supabase directly for reads via RPCs and SELECTs. Only writes route through the backend.
- **Backend writes via `service_role`** — The Express backend uses Supabase's `service_role` key for writes, bypassing RLS intentionally. This key is never exposed to the client.
- **Graceful degradation** — Matching, email notifications, and karma awards all degrade gracefully when their dependencies are unavailable.
- **No external state library** — Plain React Context + hooks. No Redux, no Zustand — just enough state management for a focused PWA.
- **Inline SVGs** — No icon library dependency. All icons are inline SVGs.

## Matching Algorithm

```ts
final_score = 0.5 × proximityScore + 0.5 × skillOverlap
```

The matching service (`backend/src/lib/matchingService.ts`) uses a **two-tier fallback**:
1. **Primary** — `nearby_volunteers_for_gig` RPC (PostGIS proximity + skill scoring)
2. **Fallback** — All profiles scored at a fixed 5000m radius (no redundant RPC retry)

Notifications are delivered in-app (via a `notifications` table) and optionally via email (EmailJS).

## Quick Start

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com/) project (free tier) with **PostGIS** extension enabled
- (Optional) EmailJS account for email notifications

### 1. Supabase Setup

```sql
-- Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create storage bucket
-- Name: participation-photos (public)

-- Enable Email auth provider in Supabase dashboard
```

Then run the migrations under `supabase/migrations/` in order.

### 2. Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your Supabase project URL and service_role key
npm install
npm run dev    # → http://localhost:3001
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env
# Edit .env with your Supabase URL and anon key
npm install
npm run dev    # → http://localhost:5173 (proxies /api → backend)
```

### Environment Variables

#### Backend (`backend/.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | 3001 | Server port |
| `SUPABASE_URL` | **Yes** | — | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | — | Secret key — never commit |
| `FRONTEND_URL` | No | `http://localhost:5173` | CORS origin |
| `EMAILJS_PUBLIC_KEY` | No | — | EmailJS public key |
| `EMAILJS_SERVICE_ID` | No | — | EmailJS service ID |
| `EMAILJS_TEMPLATE_ID` | No | — | EmailJS template ID |

#### Frontend (`frontend/.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_SUPABASE_URL` | **Yes** | — | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | **Yes** | — | Supabase anon key |
| `VITE_API_URL` | No | `/api` | Backend URL (proxied in dev) |

### Build for Production

```bash
cd backend && npm run build      # → dist/
cd frontend && npm run build     # → dist/ (static SPA)
```

## Routes & API

### Pages

| Path | Page | Access |
|------|------|--------|
| `/` | Home Landing | Public |
| `/login` / `/signup` | Auth | Public |
| `/map` | Discovery Map | Volunteer |
| `/portfolio` | My Portfolio | Volunteer |
| `/p/:slug` | Public Portfolio | Public |
| `/gigs/:id` | Gig Detail | Public |
| `/gigs/:id/participate` | Participate / Complete | Volunteer |
| `/ngo/dashboard` | NGO Dashboard | NGO |
| `/ngo/create-gig` | Create Gig | NGO |
| `/ngo/:id` | Public NGO Profile | Public |
| `/corporate/dashboard` | Corporate Dashboard | Org Member |
| `/corporate/manage` | Organization Manage | Org Admin |
| `/leaderboard` | Leaderboard | Authenticated |

### API Endpoints

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/health` | — | Health check |
| POST | `/api/gigs` | ngo | Create gig + trigger matching |
| GET | `/api/gigs/analytics` | ngo | Dashboard analytics |
| POST | `/api/gigs/:gigId/match` | ngo | Manual re-match |
| PATCH | `/api/gigs/:gigId/feature` | ngo | Feature gig (N hours) |
| POST | `/api/participations/join/:gigId` | volunteer | Join gig (409 on duplicate) |
| PATCH | `/api/participations/:id/complete` | volunteer | Complete + award karma |
| PATCH | `/api/ngo/upi` | ngo | Update UPI ID / QR URL |
| GET | `/api/organizations/analytics` | — | CSR analytics |
| POST | `/api/organizations/opt-in` | — | Toggle data-sharing opt-in |
| POST | `/api/organizations/members` | admin | Add organization member |

## Project Structure

```
KarmaMap/
├── backend/                    # Express API server
│   ├── src/
│   │   ├── lib/                # Services (matching, gigs, email, karma)
│   │   └── __tests__/          # Vitest + Supertest
│   ├── index.ts                # Entry point
│   └── package.json
├── frontend/                   # React SPA
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   ├── context/            # React Context providers
│   │   ├── hooks/              # Custom hooks
│   │   ├── pages/              # Route pages
│   │   ├── services/           # API & Supabase clients
│   │   └── types/              # TypeScript type definitions
│   └── package.json
├── supabase/
│   └── migrations/             # Database migrations (13 SQL files)
├── docs/                       # Architecture, ADRs, deployment guides
│   ├── architecture/
│   ├── decisions/
│   ├── deployment/
│   └── flows/
├── .env.example                # Environment template
├── vercel.json                 # Frontend deployment config
└── docker-compose.yml
```

## Documentation

All architectural decisions, deployment guides, data flows, and design rationale live in the [`docs/`](docs/) directory:

- **[Architecture Records](docs/decisions/)** — ADRs documenting key technical decisions and trade-offs
- **[Deployment Guide](docs/deployment.md)** — Docker Compose + Caddy + VPS deployment runbook
- **[Testing Strategy](docs/testing-strategy.md)** — Test pyramid, 75-test plan, sprint breakdown
- **[Data Flows](docs/flows/)** — User journey maps and system interaction diagrams
- **[Bug Reports](docs/bugs/)** — Reproduced issues with root cause analysis

## Testing

```bash
# Backend
cd backend && npm test

# Frontend
cd frontend && npm test

# Watch mode
npm run test:watch
```

Both use **Vitest** as the test runner. Backend API tests use **Supertest** for HTTP assertions.

## Deployment

### Docker (Recommended)

```bash
docker compose up --build
```

### Static Frontend

The frontend builds to `dist/` and can be deployed to any static host (Vercel, Netlify, Cloudflare Pages). A `vercel.json` config is included for Vercel deployments.

### Backend

The Express server can be deployed to any Node.js host (Railway, Render, Fly.io, or a VPS behind Caddy/Nginx). See [`docs/deployment.md`](docs/deployment.md) for the full VPS + Caddy runbook.

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

In short:
1. Open an issue before starting architectural work
2. Branch from `main`: `git checkout -b feature/my-change`
3. Run `npm run lint` (Biome) before committing
4. Ensure tests pass: `npm test`
5. Open a PR

### What's welcome
- Bug fixes, edge cases, and test coverage improvements
- New features that align with the project's scope
- Documentation improvements and translation
- UI/UX polish

### What to avoid
- New dependencies without discussion
- Changes to core matching logic without understanding `docs/architecture/`
- Large refactors without an associated issue

## License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  Built by <a href="https://github.com/AshayK003">Ashay Kushwaha</a> —
  <a href="https://github.com/AshayK003">GitHub</a> •
  <a href="https://x.com/sentinelcipher">X</a> •
  <a href="https://medium.com/@darkcharon3301_96987">Medium</a>
</p>
