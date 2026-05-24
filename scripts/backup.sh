#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# KarmaMap Database Backup
# Usage: ./scripts/backup.sh
#
# Dependencies: psql, gzip, curl (for S3-compatible upload)
# Env: SUPABASE_DB_URL (or will prompt)
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$SCRIPT_DIR/backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=${RETENTION_DAYS:-30}

mkdir -p "$BACKUP_DIR"

DB_URL="${SUPABASE_DB_URL:-}"
if [ -z "$DB_URL" ]; then
  if [ -f "$SCRIPT_DIR/backend/.env" ]; then
    set -a
    source "$SCRIPT_DIR/backend/.env"
    set +a
    DB_URL="${SUPABASE_DB_URL:-}"
  fi
fi

if [ -z "$DB_URL" ]; then
  read -rsp "Enter SUPABASE_DB_URL (connection string): " DB_URL
  echo
fi

echo "=== KarmaMap Backup: $TIMESTAMP ==="

# Dump
BACKUP_FILE="$BACKUP_DIR/karmamap_db_$TIMESTAMP.sql.gz"
pg_dump "$DB_URL" \
  --no-owner \
  --no-acl \
  --format=custom \
  | gzip > "$BACKUP_FILE"

echo "Backup written: $BACKUP_FILE ($(du -h "$BACKUP_FILE" | cut -f1))"

# Rotate old backups
find "$BACKUP_DIR" -name "karmamap_db_*.sql.gz" -mtime +$RETENTION_DAYS -delete
echo "Old backups (>${RETENTION_DAYS}d) cleaned."

# Optional: upload to S3-compatible storage
if [ -n "${S3_ENDPOINT:-}" ] && [ -n "${S3_BUCKET:-}" ] && [ -n "${S3_ACCESS_KEY:-}" ] && [ -n "${S3_SECRET_KEY:-}" ]; then
  echo "Uploading to S3: $S3_BUCKET/karmamap/"

  # Use curl for S3 put (avoids needing aws-cli)
  RESOURCE="/${S3_BUCKET}/karmamap/$(basename "$BACKUP_FILE")"
  CONTENT_TYPE="application/gzip"
  DATE=$(date -Ru)
  STRING_TO_SIGN="PUT\n\n${CONTENT_TYPE}\n${DATE}\n${RESOURCE}"
  SIGNATURE=$(echo -en "$STRING_TO_SIGN" | openssl sha1 -hmac "$S3_SECRET_KEY" -binary | base64)

  curl -sf -X PUT \
    -T "$BACKUP_FILE" \
    -H "Host: ${S3_ENDPOINT}" \
    -H "Date: ${DATE}" \
    -H "Content-Type: ${CONTENT_TYPE}" \
    -H "Authorization: AWS ${S3_ACCESS_KEY}:${SIGNATURE}" \
    "https://${S3_ENDPOINT}${RESOURCE}" \
    && echo "S3 upload complete." \
    || echo "S3 upload failed (non-fatal)."
fi

echo "=== Backup complete ==="
