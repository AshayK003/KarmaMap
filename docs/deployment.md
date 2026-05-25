# KarmaMap Deployment Guide

## Architecture

```
                          Internet
                             │
                          Caddy (port 443)
                     automatic TLS via Let's Encrypt
                             │
                  ┌──────────┴──────────┐
                  │                     │
            /api/*                   /*
                  │                     │
          backend:3001          frontend:80
          (Express API)        (Nginx static SPA)
                  │
          ┌───────┴───────┐
          │               │
    Supabase (managed)   EmailJS
    or self-hosted        (optional)
    PostgreSQL+PostGIS
```

**Host**: Single VPS. **Oracle Cloud free tier** (4 ARM cores, 24GB RAM, 200GB storage — truly free forever) or **Fly.io** (3 free shared VMs, 256MB RAM each) or a paid VPS ($4–6/mo, e.g. Hetzner CX22, DigitalOcean $6).

**Reverse proxy**: Caddy — automatic HTTPS, zero config, static binary.

**Frontend**: Nginx-alpine serving Vite-built static files. No Node.js in production.

**Backend**: Node.js Express API compiled to JS. Runs via `node dist/index.js`.

**Database**: Supabase free tier (500MB, PostGIS included) recommended. For full self-hosting, use `supabase/docker` or raw PostgreSQL + PostGIS.

## Prerequisites

- Docker + Docker Compose v2 on the host
- Domain name (A record → VPS IP)
- Supabase project (free tier)
- GitHub repository (GitHub Actions for CI/CD)

## Quick Start

```bash
# 1. Clone and navigate
git clone https://github.com/YOUR_ORG/karmamap
cd karmamap

# 2. Configure environment
cp .env.production backend/.env
# Edit backend/.env with your Supabase keys, domain, etc.

# 3. Deploy
./scripts/deploy.sh
```

## Files

| File | Purpose |
|------|---------|
| `Dockerfile.backend` | Multi-stage build: `tsc` compile → distroless node runtime |
| `Dockerfile.frontend` | Multi-stage: `npm run build` → nginx-alpine serving `dist/` |
| `docker-compose.yml` | Backend + frontend + Caddy |
| `Caddyfile` | Reverse proxy with auto TLS |
| `scripts/deploy.sh` | Pull images, migrate DB, restart stack |
| `scripts/backup.sh` | pg_dump to S3-compatible storage |
| ~~`docker-compose.monitoring.yml`~~ | Removed — monitoring stack was configured but backend had no `/metrics` endpoint. Re-add if `prom-client` is implemented. |
| `.github/workflows/deploy.yml` | CI: lint → build → push images → deploy via SSH |

## Environment Variables

See `.env.example` for all variables.

Create `backend/.env` on the server (never commit):

```env
# Backend
PORT=3001
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
FRONTEND_URL=https://yourdomain.com

# EmailJS (optional — in-app notifications work without it)
EMAILJS_PUBLIC_KEY=
EMAILJS_SERVICE_ID=
EMAILJS_TEMPLATE_ID=
```

Frontend vars are baked into the Docker image at build time via `VITE_*` args (see CI workflow). For local testing, use a `.env` in `frontend/`.

## Database Migrations

Migrations run against Supabase via their SQL editor or `psql`:

```bash
# Apply all migrations in order
for f in supabase/migrations/00_schema_core.sql \
         supabase/migrations/01_functions_and_realtime.sql \
         supabase/migrations/02_featured_gigs.sql \
         supabase/migrations/storage_policies.sql \
         supabase/migrations/03_atomic_karma.sql; do
  psql "$SUPABASE_DB_URL" -f "$f"
done
```

This is also wired into `scripts/deploy.sh` — it checks for a `MIGRATIONS_DIR` and applies any `.sql` file not yet tracked in a `_migrations` table.

## Build Pipeline

```
Git push (main)
    │
    ▼
GitHub Actions
    ├── Lint (tsc --noEmit, eslint)
    ├── Build (Docker images)
    ├── Push (ghcr.io)
    └── Deploy (SSH → docker-compose pull && up -d)
```

## Secrets Handling

- **GitHub Secrets**: `SSH_HOST`, `SSH_USER`, `SSH_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, EmailJS keys
- **`.env.production`**: Template committed to repo without secret values
- **`backend/.env`**: On server, manually created or populated by deploy script (first deploy only)
- **Never**: service_role key in client bundles, `.env` files in git

## Logging

Production logging strategy:

| Layer | Tool | Retention |
|-------|------|-----------|
| App stdout | `docker logs` | 3 files × 10MB |
| Structured | JSON lines to stdout | — |
| Aggregated | (Monitoring stack removed — backend had no `/metrics` endpoint) | — |

Backend logs structured JSON in production. View via:

```bash
docker compose logs -f backend
docker compose logs -f frontend
```

## Monitoring

Minimal viable stack (no payment required):

1. **Health endpoint**: `/health` returns `{"status":"ok"}` — monitored via Uptime Kuma (free, self-hosted or their cloud)
2. **Docker health checks**: Built into docker-compose — containers auto-restart on failure
3. ~~**Prometheus + Grafana**~~: Monitoring stack removed — `prometheus.yml`, `loki.yml`, and `docker-compose.monitoring.yml` were deleted because the backend had no `/metrics` endpoint. Re-add if `prom-client` is implemented.

## Backup Strategy

Automated via `scripts/backup.sh`:

| What | How | Schedule | Retention |
|------|-----|----------|-----------|
| Database | `pg_dump` → compressed → S3-compatible | Daily (cron) | 30 days |
| Docker volumes | `tar` → S3 (if any) | Daily | 7 days |
| Config | Git (infra as code) | Every push | Forever |

Backup script is idempotent. Run manually:

```bash
./scripts/backup.sh
```

Add to cron:

```bash
0 3 * * * /opt/karmamap/scripts/backup.sh
```

## Rollback Strategy

```bash
# Option 1: Previous Docker image
export TAG=v1.2.3  # or the sha of the previous successful build
docker compose up -d

# Option 2: git revert + redeploy
git revert HEAD
git push origin main
# GitHub Actions deploys automatically

# Option 3: Database rollback
psql "$SUPABASE_DB_URL" -c "DROP TABLE IF EXISTS _migrations;"
# Re-run previous migration SQL files manually
```

**Golden rule**: Always tag releases. Never deploy `:latest` blindly.

## Failure Points

| Failure | Symptom | Mitigation |
|---------|---------|------------|
| Supabase outage | Auth fails, reads fail | Backend still serves cached data (if any); client shows error message |
| EmailJS down | Match emails don't send | In-app notifications still work; error logged gracefully |
| OSRM tile server down | Map shows no tiles | Leaflet falls back to OSM; cached tiles for returning users |
| Docker daemon crash | All containers down | `restart: unless-stopped` in compose; systemd unit restarts Docker |
| Disk full | Backups fail, app crashes | Cron alert at 85% usage; logs rotated weekly |
| SSL expiry | Users see cert warning | Caddy renews automatically; monitor expiry in Grafana |
| DB connection pool exhausted | API returns 503 | Pool size tunable via Supabase dashboard; connection pooling via PgBouncer (Supabase built-in) |

## Minimum Viable Observability

If you skip Grafana/Loki, this is the **minimum** to watch:

```bash
# 1. Health check ping
curl https://yourdomain.com/health

# 2. Container status
docker compose ps

# 3. Recent errors
docker compose logs --tail=50 backend | grep -i error

# 4. Disk usage
df -h /

# 5. Uptime Kuma (free) monitoring the /health endpoint
```

## Self-Hosted Supabase (Optional)

If you prefer not to use Supabase Cloud:

```yaml
# Add to docker-compose.yml
services:
  db:
    image: postgis/postgis:16-3.4
    environment:
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./supabase/migrations:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"

  gotrue:
    image: supabase/gotrue:v2.160.0
    # ... see supabase/docker for full config
```

However, **Supabase free tier is recommended** over self-hosting — the marginal cost of $0 vs. operational overhead of managing Postgres + auth + realtime is substantial for a small team.
