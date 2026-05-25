# Critical Business Flows

**Date:** 2026-05-25
**Purpose:** Document only the flows that matter for business operations. Omit technical trivia, library details, and implementation noise.

---

## 1. Authentication

```
                    ┌──────────────────┐
                    │  Unauthenticated  │
                    │  User             │
                    └────────┬─────────┘
                             │
              ┌──────────────┴──────────────┐
              │  /login or /signup          │
              └──────────────┬──────────────┘
                             │
                    ┌────────▼─────────┐
                    │  Sign Up         │
                    │  POST email,     │
                    │  password, name, │
                    │  role, skills    │
                    └────────┬─────────┘
                             │
                    ┌────────▼──────────┐
                    │  Supabase Auth    │
                    │  creates user +   │
                    │  trigger creates  │
                    │  profile row      │
                    └────────┬──────────┘
                             │
              ┌──────────────┴──────────────┐
              │  Sign In                     │
              │  POST email + password       │
              │  → JWT stored in AuthContext │
              │  → profile fetched (role,    │
              │    name, skills, karma)      │
              └──────────────┬──────────────┘
                             │
                    ┌────────▼─────────┐
                    │  Route Dispatch  │
                    │                  │
                    │  role=volunteer  │  role=ngo
                    │  → /map          │  → /ngo/dashboard
                    │                  │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │  Authenticated   │
                    │  Session active  │
                    │  (JWT refresh    │
                    │   handled by     │
                    │   Supabase)      │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │  Sign Out        │
                    │  → clear session │
                    │  → redirect /    │
                    └──────────────────┘
```

**Key states:** `unauthenticated → authenticating → authenticated → session_expired`

**Critical paths:**
- Session restore on page load (checks `getSession()`, then `onAuthStateChange`)
- Token refresh (Supabase handles silently via HTTP-only cookie)
- Role-based route blocking (`ProtectedRoute` redirects on role mismatch)

**Failure modes:**
- Email not verified → user lands on empty dashboard with no indication
- Profile trigger fails → user has JWT but no profile row → `fetchProfile` returns null → restricted access
- Token refresh fails during API call → `apiFetch` uses stale `cachedToken` → 401 → silent failure

---

## 2. Gig Creation & Matching

```
[NGO]
  │
  ├─ 1. Navigate to /ngo/create-gig
  │
  ├─ 2. Fill form:
  │     ├─ title, description
  │     ├─ required_skills (comma-separated)
  │     ├─ volunteers_needed (1-500)
  │     ├─ gig_date + gig_time
  │     └─ location (via GPS, map click, search, or preset)
  │
  ├─ 3. Submit → POST /api/gigs
  │
  ├─ 4. Backend:
  │     ├─ Zod validation (title ≥3 chars, desc ≥10 chars, lat/lng range)
  │     ├─ Insert gig via insert_gig RPC → gigs table
  │     ├─ Find matched volunteers:
  │     │   ├─ Primary: match_volunteers_for_gig RPC (distance-based)
  │     │   ├─ Fallback: nearby_volunteers_for_gig RPC
  │     │   └─ Last resort: all volunteers, 5000m fixed radius
  │     ├─ Score: 0.5 × proximity + 0.5 × skill overlap
  │     ├─ Insert notification for each matched volunteer
  │     └─ Send email via EmailJS (if configured)
  │
  └─ 5. Response: { gig, matched_count }
       │
       ├─ Volunteer sees gig on /map (realtime broadcast)
       └─ NGO sees gig on /ngo/dashboard
```

**Trigger points:** Manual form submission only. No bulk or recurring creation.

**Side effects:** Matching triggers notifications + optional emails.

**Failure modes:**
- Matching RPC fails → silent fallback to ALL profiles fetch (OOM risk at scale)
- EmailJS not configured → matching succeeds, email silently skipped
- Location not set → PostGIS error on insert
- Matching takes >5s → no timeout protection

---

## 3. Volunteer Discovery & Participation

```
[Volunteer]
  │
  ├─ 1. Navigate to /map
  │
  ├─ 2. Location resolved (priority order):
  │     ├─ GPS (high accuracy, 5s timeout)
  │     ├─ GPS fallback (low accuracy, 15s timeout)
  │     ├─ localStorage cache (last known position)
  │     └─ DEFAULT_CENTER (Delhi: 28.6139, 77.209)
  │
  ├─ 3. Fetch nearby_gigs RPC (lat, lng, radius)
  │     ├─ Default radius: 25km
  │     ├─ Sort: featured first, then by distance
  │     └─ Optional client-side re-sort by skill overlap
  │
  ├─ 4. Browse gig cards or map markers
  │     ├─ Click marker → OSRM route from current location
  │     ├─ Click card → navigate to /gigs/:id
  │     └─ Route profiles: walking, cycling, driving
  │
  ├─ 5. Gig detail page (/gigs/:id):
  │     ├─ Title, description, NGO name
  │     ├─ Required skills (with user match indicator)
  │     ├─ Spots filled / needed progress bar
  │     ├─ Gig date with "Add to Calendar" (ICS)
  │     └─ Live weather forecast (Open-Meteo)
  │
  ├─ 6. Join gig → POST /api/participations/join/:gigId
  │     ├─ Validation: not already joined (409 if duplicate)
  │     ├─ Insert participation (status: 'joined')
  │     └─ volunteers_joined++ (trigger)
  │
  ├─ 7. Complete gig → PATCH /api/participations/:id/complete
  │     ├─ Upload before + after photos (to Supabase Storage)
  │     ├─ Submit hours (0.5-24)
  │     ├─ status → 'completed'
  │     ├─ Award karma: hours × 10 (via award_karma RPC)
  │     ├─ Increment streak
  │     ├─ Notification to NGO
  │     ├─ Email to volunteer (if configured)
  │     └─ Confetti celebration + Certificate view
  │
  └─ 8. View on /portfolio: completed gigs, karma, streak, carbon offset
```

**Key decision points:**
- Volunteer decides to join based on: distance, skill match, date, weather
- Volunteer decides to complete based on: hours worked, photo evidence

**State transitions:** `not_joined → joined → completed`

**Failure modes:**
- Geolocation denied → falls back to Delhi (irrelevant for non-Delhi users)
- OSRM unavailable → route not shown, gig still browsable
- Photo upload fails → `canSubmit` stays false, user stuck
- `award_karma` RPC fails → retries once, then throws user-facing error

---

## 4. NGO Dashboard & Analytics

```
[NGO]
  │
  ├─ 1. Navigate to /ngo/dashboard
  │
  ├─ 2. Load gigs via useRealtimeGifs(ngo_id)
  │     ├─ Fetches all NGO's gigs
  │     └─ Subscribes to realtime INSERT/UPDATE/DELETE
  │
  ├─ 3. Filter gigs: All | Open | In Progress | Completed | Closed
  │     └─ Search by title (debounced 300ms)
  │
  ├─ 4. For each gig, NgoGigCard shows:
  │     ├─ Status with color theme
  │     ├─ Volunteer progress bar
  │     ├─ Feature button (sets featured_until + N hours)
  │     └─ Inline edit: title, description, location
  │
  ├─ 5. Fetch analytics (via backend, cached 30s):
  │     ├─ total_hours volunteered
  │     ├─ completed_gigs count
  │     ├─ total_gigs created
  │     └─ chart_data: gigs over time
  │
  └─ 6. Actions:
        ├─ Create new gig → /ngo/create-gig
        ├─ Feature gig → PATCH /api/gigs/:gigId/feature
        ├─ Trigger re-match → POST /api/gigs/:gigId/match
        └─ (Edit gig removed)
```

**State transitions (gig):** `open → in_progress → completed | cancelled`

**NGO actions per gig status:**
- `open`: can feature, can cancel
- `in_progress`: can mark complete
- `completed`: read-only

---

## 5. Notifications

```
[Triggered by:]
  ├─ New gig created → notification for matched volunteers
  │     ├─ message: "New gig nearby: '{title}' — you're a top match!"
  │     └─ links to /gigs/:gigId
  │
  └─ Participation completed → notification for NGO
        ├─ message: "{volunteer_name} completed '{gig_title}'"
        └─ links to /gigs/:gigId

[Delivery channels:]
  ├─ In-app: notifications table → Realtime channel → NotificationBell
  │     ├─ Badge count on bell icon
  │     ├─ Dropdown with unread indicator (green dot)
  │     ├─ Mark single read (click) or mark all read
  │     └─ Click "View" → navigate to gig detail
  │
  └─ Email: EmailJS (if configured)
        ├─ On gig creation: match notification to matched volunteers
        └─ On completion: thank-you to volunteer
              └─ Gracefully skipped if EMAILJS_* not set
```

**State:** `unread → read`

**Lifecycle:** Notifications are never deleted. `gig_id` is set to NULL if the gig is deleted (FK `ON DELETE SET NULL`).

---

## 6. Location & Map

```
[Location resolution]
  Priority order:
    1. GPS (getCurrentPosition, high accuracy, 5s)
    2. GPS (getCurrentPosition, low accuracy, 15s) — fallback
    3. localStorage cache (karmamap_last_position)
    4. DEFAULT_CENTER (Delhi: 28.6139, 77.209)

[Location sources (UI)]
  ├─ GPS: browser geolocation API
  ├─ Search: Photon geocoding API (debounced input)
  ├─ Map click: Leaflet map click event
  ├─ Manual: lat/lng coordinate input (CreateGig only)
  └─ Preset: Lucknow RDSO (26.8193, 80.8853)

[Where location is used]
  ├─ Volunteer map discovery (nearby_gifs RPC)
  ├─ OSRM routing origin (from user location to gig)
  ├─ Gig creation pin (stored as GeoJSON Point)
  ├─ Profile location update (via update_profile_location RPC)
  └─ NgoGigCard inline location edit
```

**Location data format:**
- Storage: PostGIS `GEOGRAPHY(Point, 4326)` in `gigs.location` and `profiles.location`
- Transfer: GeoJSON `{ type: "Point", coordinates: [lng, lat] }`
- Display: parsed via `parseGigLocation()` helper
- Distance: Haversine formula in frontend, PostGIS `ST_DWithin` in RPCs

---

## 7. Leaderboard & Karma

```
[Karma award]
  Trigger: participation completed
  Formula: hours × 10
  Side effect: streak += 1 (unconditional — not day-gated)

[Leaderboard]
  Query: SELECT name, karma_points, streak
         FROM profiles
         WHERE role = 'volunteer'
         ORDER BY karma_points DESC
         LIMIT 50
  Display:
    ├─ Ranked list with medals for top 3
    ├─ Horizontal bar chart (top 10)
    └─ Streak indicator (fire emoji)

[Portfolio]
  ├─ Profile: avatar, name, bio, skills
  ├─ Stats: total karma, streak, completed gigs count
  ├─ Completed gigs list with certificates
  ├─ Carbon offset: distance × 0.12 kg CO₂/km
  ├─ Share: public portfolio at /p/:slug
  └─ Certificate: printable gold-bordered impact certificate
```

**Karma state:** Only increases (no decrement path exists).

**Known limitation:** Streak increments unconditionally — it's a "total participations" counter, not a true consecutive-days streak.

---

## 8. Data Lifecycle Summary

```
[Gig lifecycle]
  draft (conceptual) → open → in_progress → completed
                                  ↘ cancelled

[Participation lifecycle]
  pending (conceptual) → joined → completed
                     ↘ cancelled (no re-join path — UNIQUE constraint)

[Notification lifecycle]
  unread → read (no delete, no expiry)

[Karma lifecycle]
  accumulates monotonically (no spend or decrement)

[Profile lifecycle]
  created on signup (trigger) → updated via edit → never deleted
```

---

## Flow Dependency Graph

```
Authentication ──────────────────────────────────────────┐
    │                                                     │
    ├─[volunteer]─► Volunteer Discovery ──► Participation │
    │                    │                      │         │
    │                    ▼                      ▼         │
    │               Map/Location            Karma Award   │
    │                                                    │
    ├─[ngo]─► Gig Creation ──► Matching ──► Notifications│
    │              │                            │        │
    │              ▼                            ▼        │
    │         NGO Dashboard                  Emails      │
    │                                                    │
    └─[both]─► Portfolio / Leaderboard                   │
                                                         │
    External dependencies:                                │
      ├─ Supabase Auth (all auth flows)                  │
      ├─ Supabase DB (all data flows)                    │
      ├─ Supabase Realtime (live updates)                │
      ├─ OSRM (routing — volunteer discovery)            │
      ├─ Photon (geocoding — location search)            │
      └─ Open-Meteo (weather — gig detail)               │
      └─ EmailJS (email — optional)                      │
```

---

## Critical Business Rules

1. **Matching score** — `0.5 × proximity + 0.5 × skill overlap`. This is the core value proposition. If the formula is wrong, matching quality degrades.

2. **Karma = hours × 10** — The sole gamification mechanic. No karma decay, no spending. Must be atomic (the `award_karma` RPC is the only write path).

3. **Volunteers can't re-join a cancelled participation** — The `UNIQUE(volunteer_id, gig_id)` constraint prevents it. This is a design choice worth documenting: cancellation is permanent for that gig.

4. **Email is best-effort** — If EmailJS isn't configured, matching and completion still work. Email failures are logged and swallowed.

5. **Location is the primary discovery axis** — All gig discovery starts with `nearby_gigs(lat, lng, radius)`. Without location, the app shows no relevant content.
