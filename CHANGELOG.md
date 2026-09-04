# Changelog

All notable changes to this project are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- `PATCH /api/gigs/:gigId/status`: backend-owned gig lifecycle transitions
  (open to in_progress/cancelled, in_progress to completed/cancelled,
  cancelled to open) with 403 for non-owners and 409 for illegal moves.
  Migration 18 adds a database trigger rejecting illegal direct writes.
- 404 page with `*` catch-all route, skip-link and labelled main region.
- Homepage hides the stats strip on all-zero data (zeros signal emptiness);
  em-dash fallbacks remain for fetch failures.
- Rejoin after cancel (migration 19): a cancelled participation reactivates
  instead of locking the volunteer out; double joins still raise.
- Signup trigger guard (migration 20): retries are no-ops, unexpected roles
  default to volunteer.
- Gig read policy (migration 21): volunteers see open gigs; NGOs keep full
  read access to their own.
- CI `db-check` job: applies all 22 migration files to ephemeral
  Postgres+PostGIS and verifies the 7 RPCs exist.
- Test suites at backend 153 passing, frontend 63 passing.

### Changed

- Homepage copy rewritten around volunteer outcomes; NGO call-to-action
  demoted to a quiet link below the single primary CTA.
- Hero headline scales from `text-3xl` on small screens (was fixed `text-4xl`).
- Trust proxy enabled for correct rate limiting behind Render/Vercel.
- Separate write-only rate limiter (60/min in production); reads unchanged.
- Unknown `/api/*` routes return JSON 404; malformed JSON bodies return
  a clean 400 instead of parser internals.
- Raw database errors no longer leak to clients (`getMyOrg`, `getOrgName`).
- Matching scores proximity against the requested radius, not a fixed 50km.
- Email failure counting includes `false` results, not just rejections.
- `AuthContext` survives offline boot and clears local state on sign-out.
- `apiFetch` maps raw network failures to one friendly message.
- Null-safe formatting/geo/slug utilities; RFC5545-safe calendar filenames.
- Migrations 02, 12, 16 fixed for clean first-time apply (dropped the stale
  overload before redefining; `USING` on DELETE policies).
- Status transitions use conditional writes (id, owner, expected state);
  trigger rejections and races map to 409 instead of 500.
- Global error handler returns a generic message for database errors.
- Create-gig skill lists capped at 20 items of 50 chars.
- Org analytics pages large member lists and fails loudly on scan errors.
- Skill overlap unified on the 0-1 scale across frontend and backend.
- Gig weather uses the shared location parser (all formats, not just WKT).
- Photo uploads accept same-file retries and report signed-out picks.
- Map reloads on any gig update so closed gigs disappear without refresh.
- Storage policies are idempotent and create both buckets by SQL.
- Stale migration helper removed; `pg` moved to dev dependencies.

## [1.1.0] - 2026-08-23

Security and reliability release from a full-stack audit. Fixes race
conditions in the gig join/complete flows, closes privilege escalation paths
in the database layer, and repairs several silently broken features.

### Added

- Atomic `join_gig` database function: capacity is re-checked inside a locked
  transaction, so concurrent joins can no longer overfill a gig (the old JS
  check-then-act plus blind increment trigger could).
- Atomic `complete_participation` database function: status guard, participation
  update, and karma award happen in one transaction. A failed update can no
  longer pay karma for unrecorded work, and pending/cancelled participations
  cannot be completed.
- Row-level security hardening: `karma_points`, `streak`, and `role` on
  `profiles` can no longer be modified by client roles through the public API;
  RLS enabled on the previously exposed `organizations` table.
- `get_public_stats` RPC: landing-page counters now work for logged-out
  visitors and always show real numbers with a 60-second cache TTL.
- Volunteer-matching RPC returns volunteer emails again — match notification
  emails were silently never sending because the column was missing.
- Request ID middleware (`X-Request-Id`) for log correlation; `/health` now
  verifies database reachability and returns 503 when degraded.
- Retry with backoff on transient email failures (network errors and 5xx);
  permanent 4xx failures fail immediately.
- Route parameter validation: gig/participation IDs are validated as UUIDs at
  the router level; featured-gig hours capped at 720.
- In-memory role cache in auth middleware, removing one database query per
  authenticated request.

### Changed

- Completion flow notifies and emails after the transaction commits, as
  best-effort side effects that never block or roll back completion.
- Matching fallback computes real haversine distances from stored coordinates
  instead of returning fabricated distances for every volunteer.
- Frontend `apiFetch` fails fast on 4xx responses instead of retrying across
  both candidate URLs and all attempts (up to 12 requests before).
- Realtime participation counter re-fetches authoritative counts on any change
  instead of applying local +/- deltas that drifted from reality.
- Profile location only syncs on explicit picks (GPS/manual/search), not while
  browsing the map.
- Portfolio "Eco-Savings" estimate replaced with an honest "Distance
  Volunteered" stat computed from actual gig locations.
- Protected routes redirect to login if the profile has not loaded within an
  8-second grace period, instead of spinning forever.
- Public portfolio fetches only the columns it renders.
- Docker image runs as non-root with a HEALTHCHECK on Node 22; Vercel installs
  with `npm ci`; Render manifest includes EmailJS env vars and health check path.
- Frontend proxies `/api/*` to the backend in production via rewrite rules.

### Removed

- Hardcoded Lucknow preset button (replaced by neutral default-center preset).
- Fabricated CO2/tree conversion math.
- Unused `award_karma` service fallback (read-modify-write race) — karma moves
  entirely inside the atomic completion function.
