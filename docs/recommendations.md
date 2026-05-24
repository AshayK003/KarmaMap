# KarmaMap — Tool & Architecture Recommendations

Based on a deep audit of the codebase. Each recommendation is ranked by impact-to-effort ratio.

---

## 🔴 Critical: Rotate Exposed Secrets

**What**: `backend/.env.example` and `frontend/.env.example` contain **live** Supabase project credentials (service_role key + anon key + project URL). These were committed to git.

**Fix**:
1. **Rotate the service_role key** immediately in Supabase dashboard
2. **Rotate the anon key** (it's public-facing so less critical, but rotate anyway)
3. Replace both `.env.example` files with placeholder values:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Impact**: Compromised service_role key gives full admin access to your database. Rotate today.

**Effort**: 5 minutes.

---

## 🟠 High: Type-Safe Supabase Client (Monorepo Lite)

### What's wrong
Types are hand-written in `frontend/src/types/database.ts` and duplicated inline across backend services. No shared types. Zod schemas duplicated on frontend + backend.

### Recommendation: Supabase CLI Type Generation

```
npx supabase gen types typescript --project-id "$PROJECT_REF" > shared/database.types.ts
```

Then import in both frontend and backend:

```typescript
// Frontend
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../shared/database.types'
const supabase = createClient<Database>(url, anonKey)

// Backend
import type { Database } from '../shared/database.types'
export const supabaseAdmin = createClient<Database>(url, serviceRoleKey)
```

### Why it matters
- Catches column name typos at compile time
- Auto-completes table names, column names, RPC params
- Eliminates all handwritten DB types (~106 lines of fragile manual types)
- Frontend and backend always in sync

### Tradeoffs
- Requires `supabase` CLI installed in CI
- Types are a snapshot — must regenerate after migrations
- Generated types are verbose (deeply nested generics)

### Integration difficulty: Low
```bash
npm install -D supabase   # in both or a shared package
npx supabase gen types typescript --linked > src/types/database.ts
# Then git add && commit
```

### Effort: 1 hour to set up, 5 minutes per migration to regenerate.

### Better approach: Add to `package.json` as a script:
```json
"update-types": "npx supabase gen types typescript --project-id \"$PROJECT_REF\" > src/types/database.ts"
```

And add a scheduled GitHub Action to auto-generate on schema changes.

---

## 🟠 High: Security Hardening

### What's missing
- No rate limiting on any endpoint
- No security headers (CSP, HSTS, X-Frame-Options)
- No request body size limit
- No validation on URL params (UUID format)

### Recommendation

**1. Add `helmet` to backend** (2 lines, 1 package):

```bash
npm install helmet
```

```typescript
// backend/index.ts
import helmet from 'helmet'
app.use(helmet())
```

**2. Add `express-rate-limit`** (2 lines, 1 package):

```bash
npm install express-rate-limit
```

```typescript
import rateLimit from 'express-rate-limit'

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 min
  limit: 100,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
})

app.use('/api/', limiter)

// Stricter for sensitive endpoints
const joinLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
})

app.use('/api/participations/join/', joinLimiter)
```

**3. Add body size limit** (1 line edit):

```typescript
// Already uses express.json() — just add the limit
app.use(express.json({ limit: '1mb' }))
```

**4. Validate UUID params with Zod**:

```typescript
import { z } from 'zod'
const uuidParam = z.string().uuid()

// In controller:
const gigId = uuidParam.parse(req.params.gigId)
```

### Why it matters
- Currently, a single IP can spam `/api/gigs/:gigId/match` and trigger unlimited email sends
- No CSP means XSS vulnerabilities are easier to exploit
- No body limit allows oversized payload DoS

### Tradeoffs
- `helmet` CSP directives may block inline styles (common in Tailwind). Use `helmet.contentSecurityPolicy({ directives: { ... } })` with permissive rules for dev.
- Rate limiting with in-memory store resets on server restart. For multi-instance, use Redis store (free with the Redis service you're already running — see Queue recommendation below).

### Integration difficulty: Low (each is 1-3 lines of code)

---

## 🟡 Medium: Offline PWA Support

### What's wrong
- No offline fallback page — navigating offline shows browser error
- No standard PNG icons (only SVG with `sizes: 'any'`)
- Background sync for photo uploads not implemented

### Recommendation: Add offline fallback + icon generation

In `vite.config.ts`:

```typescript
VitePWA({
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
    runtimeCaching: [
      // existing OSM tile cache
    ],
  },
  // Add offline fallback
  // In your custom service worker or via workbox:
})

// Also add to vite-plugin-pwa config:
navigateFallback: '/offline.html',
```

Create `frontend/public/offline.html` — a minimal page that says "You're offline" with a retry button.

For icons, use a free tool like `@vite-pwa/assets-generator` to generate all icon sizes from a single SVG.

### Why it matters
- Users on unreliable networks get a blank page
- PWA install prompt may not fire without proper icons
- This is a "PWA" in name only without offline support

### Tradeoffs
- Offline fallback is a static page — no dynamic content offline
- Background sync requires IndexedDB and a service worker sync handler
- Adds complexity to the service worker

### Integration difficulty: Medium

---

## 🟡 Medium: Extract Shared Zod Schemas

### What's wrong
The same field validations exist in multiple places:
- `createGigSchema` in `backend/controllers/gigController.ts`
- Frontend Zod schema in `frontend/src/pages/CreateGig.tsx`
- `completeGigSchema` in `backend/controllers/participationController.ts`
- Frontend form schema in `frontend/src/pages/ParticipateGig.tsx`

### Recommendation: Create a `shared/` directory at repo root

```
karmamap/
  shared/
    schemas.ts       # Zod schemas shared by frontend + backend
    types.ts         # Shared TS types (not DB-specific)
  backend/
    ... (import from ../shared/schemas.js)
  frontend/
    ... (import from ../shared/schemas.ts)
```

```typescript
// shared/schemas.ts
import { z } from 'zod'

export const createGigSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  lat: z.number(),
  lng: z.number(),
  required_skills: z.array(z.string()).default([]),
  volunteers_needed: z.number().int().min(1).default(1),
  gig_date: z.string().min(1),
})

export const completeGigSchema = z.object({
  hours: z.coerce.number().min(0.5).max(24),
  before_photo_url: z.string().min(1).optional(),
  after_photo_url: z.string().min(1).optional(),
})

export const featureGigSchema = z.object({
  hours: z.number().positive(),
})
```

### Why it matters
- Single source of truth for validation rules
- Changing a field name or constraint updates both client and server
- Eliminates accidental divergence

### Tradeoffs
- Requires both `package.json` to include `zod` (already done)
- Backend ESM imports need `.js` extensions — TypeScript `paths` config may help
- The shared module needs to work with both NodeNext (backend) and bundler (frontend) module resolution

### Integration difficulty: Low
Just extract, import, and delete the old copies.

---

## 🟡 Medium: Fix the 7 `as any` Type Casts

### What's wrong
7 `as any` casts in production code (not tests):

| File | Line | Cast | Why |
|------|------|------|-----|
| `Signup.tsx` | 36 | `zodResolver(schema) as any` | Type mismatch with react-hook-form |
| `CreateGig.tsx` | 55 | Same | Same |
| `ParticipateGig.tsx` | 41 | Same | Same |
| `supabase.ts` | 18 | `ws as any` | WebSocket transport type mismatch |
| `VolunteerPortfolio.tsx` | 180 | `(p as any).gigs?.location` | Typed access bypass |

### Fixes:

**React Hook Form resolver types**: Create a typed wrapper or upgrade to the latest `@hookform/resolvers` which fixed the type compatibility:

```typescript
// Instead of: zodResolver(schema) as any
// Use the typed version:
import { zodResolver } from '@hookform/resolvers/zod'
const resolver = zodResolver(schema) // Should be typed in latest versions
```

**`ws as any`**: Cast to the specific expected type:
```typescript
import type { WebSocket } from 'ws'
realtime: { transport: WebSocket as unknown as any }
```

**`(p as any).gigs?.location`**: Define a proper joined type instead of bypassing:
```typescript
interface ParticipationWithGig extends Participation {
  gigs: { location: Gig['location'] }
}
```

### Why it matters
- Each `as any` is a blind spot where TypeScript stops checking
- Runtime errors that would be caught at compile time sneak through
- 3 of 7 are identical workarounds — fixing the root cause fixes all 3

### Integration difficulty: Low

---

## 🟡 Medium: Fix Unused/Half-Dead Code

### What was found
- `sendEmailOrThrow` — exported but never called anywhere
- `get_gig_location` RPC result fetched but only passed as `_locationRow` (unused parameter)
- Redundant check in `index.ts` line 39: both `err.name === 'ZodError'` AND `err.constructor?.name === 'ZodError'`
- `matchVolunteersFallback` parameter `_locationRow` declared but never read

### Fix: Delete dead code, clean up redundancies.

```typescript
// Remove sendEmailOrThrow entirely
// Remove _locationRow parameter from matchVolunteersFallback
// Remove the duplicate ZodError check (keep the constructor check for safety)
```

---

## 🟡 Medium: Async Job Queue for Matching

### What's wrong
When a gig is created (`POST /api/gigs`), the matching + notification + email cycle runs **synchronously** before the HTTP response is sent. If matching takes 5 seconds, the NGO waits 5 seconds for a 201 response.

### Recommendation: jobslite (BullMQ alternative, zero deps)

```javascript
// backend/services/queue.ts
import { Queue, Worker } from 'jobslite'

const matchingQueue = new Queue('matching')

export async function enqueueMatching(gigId: string, gigTitle: string) {
  await matchingQueue.connect()
  await matchingQueue.add('match', { gigId, gigTitle })
}

const worker = new Worker('matching', async (job) => {
  const { gigId, gigTitle } = job.data
  const matched = await findMatchedVolunteers(gigId)
  await notifyMatchedVolunteers(gigId, matched, gigTitle)
  await sendGigMatchEmails(matched, gigTitle)
})
```

### Tradeoffs

| Approach | Pros | Cons |
|----------|------|------|
| **Current (sync)** | Simple, zero infra | Blocks HTTP response for seconds |
| **jobslite** | Zero deps, uses existing Postgres, BullMQ-compatible API | Less mature (2026), smaller community |
| **BullMQ** | Battle-tested (9K stars, 5.7M weekly downloads) | Requires Redis |
| **bunqueue** | Zero deps, SQLite, 286K ops/sec | Requires Bun runtime (not Node) |

**Recommendation**: Stay with synchronous matching for now (it's fine at current scale). If latency becomes a problem, add `jobslite` — it uses your existing PostgreSQL and requires no new infrastructure.

### Why not now
- Matching runs in <1 second for typical dataset
- It's already wrapped in try/catch — the response returns 201 regardless
- Adding a queue is infrastructure complexity with no current user-facing benefit

---

## 🔵 Low: Zustand for Client State (Optional)

### What's wrong
React Context is used for auth + theme. This is fine today — both change infrequently. But:

- `AuthContext` re-fetches profile on every route change
- Notification state lives in `useState` inside `NotificationBell` — not shared
- Location state is passed via props through component tree

### Recommendation: Only if you see re-render issues

```typescript
// store/auth.ts
import { create } from 'zustand'

interface AuthState {
  user: User | null
  profile: Profile | null
  setUser: (user: User | null) => void
  setProfile: (profile: Profile | null) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
}))

// Use in components:
const user = useAuthStore((s) => s.user)  // Only re-renders on user change
const profile = useAuthStore((s) => s.profile)  // Only re-renders on profile change
```

### Why you don't need it yet
- Context fires re-renders on every value change, but AuthContext uses `useMemo` (good)
- 1.1KB gzipped — won't hurt bundle, but won't help either if Context is working
- Zustand + TanStack Query is the gold standard for server-state heavy apps, but this app has minimal server state

**Verdict**: Skip for now. If you see layout re-renders on auth state changes, replace Context with Zustand (30-minute migration).

---

## 🔵 Low: Bundle Analysis

### What's wrong
- Leaflet (~40KB) + Recharts (~60KB) likely in the main bundle
- CSS imports from leaflet.markercluster (~20KB non-tree-shakeable)
- Google Fonts Plus Jakarta Sans (~15KB blocking render)

### Recommendation: Run a one-time analysis

```bash
npm install -D vite-plugin-visualizer
```

```typescript
// vite.config.ts
import { visualizer } from 'rollup-plugin-visualizer'

plugins: [
  react(),
  visualizer({ open: true }),
]
```

Then:
1. Check if `leaflet.css` and `MarkerCluster.css` can be lazy-loaded only on `/map` route
2. Consider removing Google Fonts and using Tailwind's built-in font stack (system fonts)
3. Confirm code-splitting is working for all lazy-loaded routes

### Why low priority
- 11 routes are already lazy-loaded — good code-splitting foundation
- Leaflet and Recharts are needed on the pages that use them
- PWA caching means first load is the only slow one

---

## Summary: Priority Order

| Priority | Recommendation | Effort | Impact |
|----------|---------------|--------|--------|
| 🔴 **Today** | Rotate exposed secrets | 5 min | Prevents DB compromise |
| 🟠 **This week** | Supabase type generation | 1 hr | Prevents type bugs |
| 🟠 **This week** | Security hardening (helmet + rate-limit + body limit) | 30 min | Prevents abuse |
| 🟡 **This sprint** | Extract shared Zod schemas | 1 hr | Prevents validation drift |
| 🟡 **This sprint** | Fix 7 `as any` casts | 30 min | Restores type safety |
| 🟡 **This sprint** | Clean unused/dead code | 15 min | Reduces confusion |
| 🟡 **This sprint** | PWA offline fallback | 2 hr | Fulfills PWA promise |
| 🔵 **Next month** | Bundle analysis + optimization | 1 hr | Faster first load |
| 🔵 **Next month** | Zustand for re-render fixes | 30 min | If needed |
| 🔵 **Later** | Async job queue | 2 hr | If matching becomes slow |

## Tools That Were Considered and Rejected

| Tool | Why Rejected |
|------|-------------|
| **Pelias** (self-hosted geocoder) | Requires Elasticsearch — heavy ops overhead for geocoding ~8 queries per search. Photon (current) is fine for scale. |
| **Nominatim** (self-hosted geocoder) | 128GB+ RAM for full planet import, Python stack. Overkill. |
| **BullMQ** | Requires Redis — another stateful service to manage. Use jobslite later if needed (Postgres-backed). |
| **Monorepo (Nx/Turborepo)** | 2 packages don't warrant the tooling complexity. Manual `shared/` dir is simpler. |
| **TanStack Query** | App fetches data via Supabase realtime subscriptions and REST — not classic CRUD. Would add complexity for minimal gain. |
| **Prisma ORM** | Supabase already provides typed client. Prisma would be a second ORM on top of Supabase queries. |
| **Playwright/Cypress** | E2E tests add CI minutes and flakiness. Supertest API tests catch the same bugs at 1/10th the time. |
