#!/bin/sh
# Nightly MongoDB backup.
# Runs inside the `mongo-backup` container (see docker-compose.yml).
# Dumps the whole cluster to /backups/gsn-YYYY-MM-DD_HHMM.gz, then
# deletes files older than ${BACKUP_KEEP_DAYS:-30}.
set -eu

STAMP="$(date -u +%Y-%m-%d_%H%M)"
OUT="/backups/gsn-${STAMP}.gz"
KEEP="${BACKUP_KEEP_DAYS:-30}"

echo "[backup] $(date -u '+%F %T') starting -> ${OUT}"

mongodump \
    --host "${MONGO_HOST:-mongo}:27017" \
    --username "${MONGO_ROOT_USERNAME}" \
    --password "${MONGO_ROOT_PASSWORD}" \
    --authenticationDatabase admin \
    --archive="${OUT}" --gzip

SIZE="$(du -h "${OUT}" | cut -f1)"
echo "[backup] $(date -u '+%F %T') wrote ${OUT} (${SIZE})"

echo "[backup] rotating: keeping ${KEEP} days"
find /backups -name 'gsn-*.gz' -type f -mtime +"${KEEP}" -print -delete || true

echo "[backup] done"
