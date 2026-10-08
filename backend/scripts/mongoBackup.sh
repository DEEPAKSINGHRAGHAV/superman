#!/usr/bin/env bash
#
# Daily MongoDB backup with 30-day retention.
#
# Each run writes one compressed archive named by date, e.g.
#   shivik_mart_backup_08-10-2026.archive.gz   (DD-MM-YYYY)
# and then deletes archives whose name-date is older than RETENTION_DAYS.
# Running it again on the same day replaces that day's backup.
#
# Usage:   bash scripts/mongoBackup.sh
# Cron:    30 20 * * * /var/www/superman/backend/scripts/mongoBackup.sh
# Restore: mongorestore --uri="<MONGODB_URI>" --gzip --archive=<file> --drop
#
# Overridable via env: BACKUP_DIR, RETENTION_DAYS, ENV_FILE

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="${ENV_FILE:-$BACKEND_DIR/config.env}"
BACKUP_DIR="${BACKUP_DIR:-$BACKEND_DIR/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
LOG_FILE="$BACKUP_DIR/backup.log"
PREFIX="shivik_mart_backup_"
SUFFIX=".archive.gz"

mkdir -p "$BACKUP_DIR"

log() {
    echo "[$(date '+%d-%m-%Y %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

# Never run two backups at once (e.g. a manual run during the cron run)
exec 9>"$BACKUP_DIR/.backup.lock"
if ! flock -n 9; then
    log "Another backup is already running, exiting."
    exit 1
fi

if ! command -v mongodump >/dev/null 2>&1; then
    log "ERROR: mongodump not found. Install mongodb-database-tools."
    exit 1
fi

# Read the URI without sourcing the file (the '&' in the URI would break `source`)
MONGODB_URI="$(grep -E '^MONGODB_URI=' "$ENV_FILE" | tail -n1 | cut -d= -f2- | sed -e 's/^["'\'']//' -e 's/["'\'']$//')"
if [ -z "$MONGODB_URI" ]; then
    log "ERROR: MONGODB_URI not set in $ENV_FILE"
    exit 1
fi

# ---------- 1. Backup ----------
TODAY="$(date '+%d-%m-%Y')"
TARGET="$BACKUP_DIR/${PREFIX}${TODAY}${SUFFIX}"
TMP="$TARGET.tmp"

log "Starting backup -> $(basename "$TARGET")"
if ! mongodump --uri="$MONGODB_URI" --gzip --archive="$TMP" --quiet; then
    rm -f "$TMP"
    log "ERROR: mongodump failed, old backups left untouched."
    exit 1
fi
if [ ! -s "$TMP" ]; then
    rm -f "$TMP"
    log "ERROR: backup file is empty, old backups left untouched."
    exit 1
fi
mv -f "$TMP" "$TARGET"
log "Backup complete: $(basename "$TARGET") ($(du -h "$TARGET" | cut -f1))"

# ---------- 2. Retention (only after a successful backup) ----------
CUTOFF="$(date -d "-${RETENTION_DAYS} days" '+%Y%m%d')"
deleted=0
shopt -s nullglob
for f in "$BACKUP_DIR"/${PREFIX}??-??-????${SUFFIX}; do
    name="$(basename "$f" "$SUFFIX")"
    d="${name#"$PREFIX"}"                       # DD-MM-YYYY
    ymd="${d:6:4}${d:3:2}${d:0:2}"              # YYYYMMDD
    [[ "$ymd" =~ ^[0-9]{8}$ ]] || continue
    if [ "$ymd" -lt "$CUTOFF" ]; then
        rm -f "$f"
        log "Deleted old backup: $(basename "$f")"
        deleted=$((deleted + 1))
    fi
done
log "Retention: kept last ${RETENTION_DAYS} days, deleted ${deleted} backup(s)."
