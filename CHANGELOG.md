# Changelog

All notable changes to this project are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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
