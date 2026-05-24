#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# KarmaMap Deploy Script
# Usage: ./scripts/deploy.sh
#
# Pulls latest images, runs database migrations, restarts stack.
# Intended to run on the production server (or locally for dev).
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$SCRIPT_DIR"

# Verify environment
if [ ! -f "backend/.env" ]; then
  echo "ERROR: backend/.env not found. Create it from .env.example."
  exit 1
fi

if [ ! -f "docker-compose.yml" ]; then
  echo "ERROR: docker-compose.yml not found."
  exit 1
fi

echo "=== KarmaMap Deploy ==="

# Load env for VITE_ vars (optional if deploying from CI)
if [ -f "backend/.env" ]; then
  set -a
  source backend/.env
  set +a
fi

export TAG="${TAG:-latest}"

# Pull images (useful when TAG is pinned to a specific sha)
echo "[1/3] Pulling images..."
docker compose pull

# Run database migrations
echo "[2/3] Running migrations..."
MIGRATIONS_DIR="${MIGRATIONS_DIR:-./supabase/migrations}"
if [ -d "$MIGRATIONS_DIR" ] && [ -n "${SUPABASE_DB_URL:-}" ]; then
  for f in "$MIGRATIONS_DIR"/*.sql; do
    [ -f "$f" ] || continue
    BASENAME=$(basename "$f")
    echo "  Applying: $BASENAME"
    psql "$SUPABASE_DB_URL" -f "$f" 2>&1 | grep -v "already exists" || true
  done
  echo "  Migrations complete."
elif [ -z "${SUPABASE_DB_URL:-}" ]; then
  echo "  SKIP: SUPABASE_DB_URL not set (run migrations manually)."
else
  echo "  SKIP: No migration files found in $MIGRATIONS_DIR."
fi

# Restart stack
echo "[3/3] Restarting services..."
docker compose up -d --remove-orphans

# Clean up unused images
docker image prune -f

echo "=== Deploy complete ==="
docker compose ps
