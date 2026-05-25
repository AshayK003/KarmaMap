# KarmaMap — Frontend

React 19 + TypeScript 6 SPA with Leaflet maps, Recharts, and PWA support.

## Dev

```bash
npm install
npm run dev        # port 5173, /api proxied to localhost:3001
```

## Build

```bash
npm run build      # → dist/ (static SPA for Vercel deploy)
npm run preview    # preview production build locally
```

## Testing

```bash
npm run test       # Vitest (36 tests)
```

## Key Dependencies

| Package | Purpose |
|---|---|
| react-leaflet + react-leaflet-cluster | Map, markers, clustering |
| @supabase/supabase-js | Auth + anon reads |
| recharts | Analytics charts |
| canvas-confetti | Certificate celebration |
| sonner | Toast notifications |
| vite-plugin-pwa | PWA + OSM tile caching |
| date-fns | Date formatting |
| tailwindcss v4 | Styling |

## Project Structure

```
src/
├── pages/           # 14 route pages
├── components/      # Shared UI (MapView, GigCard, Navbar, etc.)
├── components/ui/   # shadcn/ui primitives (9 components)
├── context/         # AuthContext, ThemeContext
├── hooks/           # Geolocation, location picker, realtime subscriptions
├── services/        # API wrappers (gigs, ngo, geocoding, storage)
├── types/           # TypeScript interfaces (NearbyGig, etc.)
├── lib/             # Supabase client, utility functions
└── utils/           # api.ts, geo.ts, weather.tsx, format.ts
```

## Architecture Notes

- **Reads via Supabase anon client** — direct RPCs and SELECT queries
- **Writes via REST API** — backend Express server with JWT auth
- **No external state library** — React Context + hooks only
- **No icon library** — inline SVGs in `NavIcons.tsx`
- **Avatars** — DiceBear initials SVG with user silhouette fallback
- **Dark mode** — localStorage + system preference, Tailwind v4 class-based
