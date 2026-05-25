# Refactor: Add Rate Limiting

**Date:** 2026-05-25
**Status:** Complete

## Motivation
No rate limiting on the Express API meant brute-force login attempts, DoS on matching endpoints, and no abuse protection. Production deployment needed baseline throttling.

## Scope
- `backend/index.ts` — register middleware
- `backend/package.json` — add `express-rate-limit`

## Before
Frontend proxies `/api` → backend. No middleware throttled requests. Any client could hammer any endpoint without limit.

## After
- `express-rate-limit` registered as global middleware
- 100 requests per 1-minute window per IP
- Production only: skipped via `!isDev` guard so tests (which create fresh `app` per file) aren't interfered with
- Returns standard 429 Too Many Requests with `Retry-After` header

## Migration Plan
1. `npm install express-rate-limit` in `backend/`
2. Import and configure middleware in `index.ts` before route registration
3. Wrap in `if (!isDev)` to avoid test interference

## Regression Risks
- Tests could hit rate limit if not guarded → mitigated by `!isDev` guard
- Could block legitimate clients if window too small → 100 req/min is generous for a hyper-local app with ~10-50 DAU

## Verification
- Tested via supertest: `POST /health` 101 times in rapid succession returns 429
- All 85 backend tests pass (rate limiter inactive in test mode)
