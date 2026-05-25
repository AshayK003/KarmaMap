# Environment Security Audit

## Findings Summary

| Severity | Count |
|---|---|
| 🔴 Critical | 0 |
| 🟠 High | 0 |
| 🟡 Medium | 1 |
| 🔵 Low | 3 |

---

## 🔴 Critical (0)

None.

---

## 🟠 High (0)

None.

---

## 🟡 Medium (1)

### M1: Unused `DATABASE_URL` in `.env.example`

- **File**: `backend/.env.example`
- **Risk**: Contains `DATABASE_URL=postgresql://postgres:password@db...` — a placeholder that implies direct DB access. The `pg-boss` queue service that used this was already removed (`queue.ts` deleted). No code reads `DATABASE_URL` today, but if a developer puts a real connection string here, it sits in the repo's `.env.example` as a reference to direct PostgreSQL access.
- **Fix applied**: Removed `DATABASE_URL` from `backend/.env.example`.

---

## 🔵 Low (3)

### L1: No `helmet` security headers

- **File**: `backend/index.ts`
- **Risk**: The Express backend does not set standard security response headers (`X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`). For a JSON API that returns no HTML, the practical risk is low (no XSS vectors in JSON). HSTS should be handled by the reverse proxy (Caddy/nginx).
- **Mitigation**: The CSP is set client-side in `frontend/index.html`. Backend serves only JSON. Acceptable as-is.

### L2: Dev CORS wide open

- **File**: `backend/index.ts:22`
- **Risk**: `origin: true` in dev mode accepts any origin. If `NODE_ENV=development` is accidentally set on a production server, CORS would be permissive.
- **Mitigation**: Production deployments should use `NODE_ENV=production` with explicit `FRONTEND_URL` set. Documented in deployment guide.

### L3: Rate limiting only in production

- **File**: `backend/index.ts:30-38`
- **Risk**: No rate limiting in dev mode. Local development only — acceptable.
- **Mitigation**: Rate limits (100 req/min) are active in production.

---

## Verified Secure Items

| Item | Status |
|---|---|
| `.env.example` uses placeholders only | ✅ |
| No real secrets in git history | ✅ |
| No hardcoded API keys in source | ✅ |
| `service_role` key never used client-side | ✅ |
| Frontend uses Supabase **anon** key only | ✅ |
| Backend uses `service_role` in server-only code | ✅ |
| Auth JWT verified via `supabase.auth.getUser()` | ✅ |
| RLS enabled on all 4 tables (13 policies) | ✅ |
| `SECURITY DEFINER` functions set `search_path` explicitly | ✅ |
| CSP restricts `img-src`, `connect-src`, `script-src`, etc. | ✅ |
| No console.log of tokens/passwords/secrets | ✅ |
| Error handler does not leak stack traces | ✅ |
| JSON body limited to 1mb | ✅ |
| CORS restricts production origin | ✅ |
| EmailJS gracefully disabled when env vars missing | ✅ |
| No `DATABASE_URL` (queue removed) | ✅ |
| Session data uses `sessionStorage` (not `localStorage`) | ✅ |

---

## Recommendations (optional, not blocking)

1. Add `helmet` middleware for defense-in-depth: `npm install helmet` + `app.use(helmet())` in production.
2. Set `Strict-Transport-Security` via reverse proxy (Caddy: `header Strict-Transport-Security "max-age=63072000"`).
3. Remove `DATABASE_URL` from deployment runbook if still referenced.
