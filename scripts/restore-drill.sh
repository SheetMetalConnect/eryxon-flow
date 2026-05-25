#!/usr/bin/env bash
#
# restore-drill.sh — Eryxon Flow backup/restore drill + recovered-environment smoke check.
#
# Packages the validated ERY-41 manual drill into one repeatable, engineer-owned command.
# It backs up Flow's application-owned state (public/auth/storage schemas + the Supabase
# storage payload volume), restores it into a DISPOSABLE scratch database and directory,
# then runs smoke checks that go beyond row counts (file checksum parity, referential
# integrity, and a critical RLS helper function).
#
# It NEVER touches production or the live local working database. Restores land in a
# throwaway scratch database (dropped on success unless --keep is passed).
#
# Usage:
#   scripts/restore-drill.sh [--keep] [--log <path>]
#
# Env overrides (sensible local-stack defaults):
#   SUPABASE_DB_URL       Source DB        (default: postgresql://postgres:postgres@127.0.0.1:54322/postgres)
#   STORAGE_CONTAINER     Storage volume   (default: supabase_storage_eryxon-flow)
#   STORAGE_ROOT          Payload root     (default: /mnt/stub/stub)
#   DOCKER_BIN            docker binary     (default: autodetect docker / /usr/local/bin/docker)
#
# Exit codes: 0 = drill + all smoke checks passed; non-zero = a step or smoke check failed.

set -euo pipefail

# --- Config -----------------------------------------------------------------
SUPABASE_DB_URL="${SUPABASE_DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
STORAGE_CONTAINER="${STORAGE_CONTAINER:-supabase_storage_eryxon-flow}"
STORAGE_ROOT="${STORAGE_ROOT:-/mnt/stub/stub}"
# Dump/restore run inside the db container so pg_dump matches the server major version
# (host pg_dump often drifts behind the container's PostgreSQL). Read-only count/smoke
# queries use host psql, which is version-tolerant for plain SQL.
DB_CONTAINER="${DB_CONTAINER:-supabase_db_eryxon-flow}"
CONTAINER_DB_HOSTPORT="${CONTAINER_DB_HOSTPORT:-127.0.0.1:5432}"
KEEP_ARTIFACTS=0
LOG_PATH=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --keep) KEEP_ARTIFACTS=1; shift ;;
    --log) LOG_PATH="${2:?--log needs a path}"; shift 2 ;;
    -h|--help) sed -n '2,32p' "$0"; exit 0 ;;
    *) echo "Unknown argument: $1" >&2; exit 2 ;;
  esac
done

# Resolve docker binary (PATH may be sandboxed).
DOCKER_BIN="${DOCKER_BIN:-}"
if [[ -z "$DOCKER_BIN" ]]; then
  if command -v docker >/dev/null 2>&1; then DOCKER_BIN="$(command -v docker)";
  elif [[ -x /usr/local/bin/docker ]]; then DOCKER_BIN=/usr/local/bin/docker;
  else echo "FATAL: docker not found; set DOCKER_BIN" >&2; exit 1; fi
fi

# Entities verified for count parity. Format: "label|schema.table".
ENTITIES=(
  "jobs|public.jobs"
  "parts|public.parts"
  "profiles|public.profiles"
  "tenants|public.tenants"
  "storage_buckets|storage.buckets"
  "storage_objects|storage.objects"
)

TS="$(date -u +%Y%m%d%H%M%S)"
SCRATCH_DB="ery_restore_${TS}"
WORKDIR="$(mktemp -d "${TMPDIR:-/tmp}/ery-restore-drill.XXXXXX")"
DUMP_FILE="${WORKDIR}/flow-backup.sql"
STORAGE_TAR="${WORKDIR}/storage-snapshot.tar.gz"
RESTORE_DIR="${WORKDIR}/storage-restore"
ADMIN_DB_URL="${SUPABASE_DB_URL%/*}/postgres"
SCRATCH_DB_URL="${SUPABASE_DB_URL%/*}/${SCRATCH_DB}"
# In-container connection strings (version-matched pg_dump / restore load).
CADMIN_URL="postgresql://postgres:postgres@${CONTAINER_DB_HOSTPORT}/postgres"
CSCRATCH_URL="postgresql://postgres:postgres@${CONTAINER_DB_HOSTPORT}/${SCRATCH_DB}"

FAILED=0
START_EPOCH="$(date -u +%s)"

log() { printf '%s\n' "$*"; }
section() { printf '\n=== %s ===\n' "$*"; }

cleanup() {
  if [[ "$KEEP_ARTIFACTS" -eq 1 ]]; then
    log ""
    log "Artifacts kept (--keep):"
    log "  workdir:    ${WORKDIR}"
    log "  scratch db: ${SCRATCH_DB}"
    return
  fi
  "$DOCKER_BIN" exec "$DB_CONTAINER" psql "$CADMIN_URL" -v ON_ERROR_STOP=0 -q \
    -c "DROP DATABASE IF EXISTS \"${SCRATCH_DB}\" WITH (FORCE);" >/dev/null 2>&1 || true
  rm -rf "$WORKDIR"
}
trap cleanup EXIT

# --- Preflight --------------------------------------------------------------
section "Preflight"
for bin in pg_dump psql sha256sum; do
  if ! command -v "$bin" >/dev/null 2>&1; then
    # macOS ships shasum, not sha256sum.
    if [[ "$bin" == "sha256sum" ]] && command -v shasum >/dev/null 2>&1; then
      sha256sum() { shasum -a 256 "$@"; }
      export -f sha256sum 2>/dev/null || true
      continue
    fi
    echo "FATAL: required tool '$bin' not found in PATH" >&2; exit 1
  fi
done
# sha256 helper that works with both sha256sum and shasum.
sha256_of() {
  if command -v sha256sum >/dev/null 2>&1; then sha256sum "$1" | awk '{print $1}';
  else shasum -a 256 "$1" | awk '{print $1}'; fi
}

if ! psql "$SUPABASE_DB_URL" -tAc "select 1" >/dev/null 2>&1; then
  echo "FATAL: cannot reach source DB at ${SUPABASE_DB_URL}" >&2; exit 1
fi
for c in "$STORAGE_CONTAINER" "$DB_CONTAINER"; do
  if ! "$DOCKER_BIN" inspect "$c" >/dev/null 2>&1; then
    echo "FATAL: container '${c}' not found" >&2; exit 1
  fi
done
log "Source DB reachable, containers present, tools available."
log "Scratch DB:   ${SCRATCH_DB}"
log "Work dir:     ${WORKDIR}"

# --- Step 1: schema-scoped DB backup ----------------------------------------
section "1/6 Backup database (public, auth, storage)"
"$DOCKER_BIN" exec "$DB_CONTAINER" pg_dump "$CADMIN_URL" \
  --schema=public --schema=auth --schema=storage \
  --no-owner --no-privileges --no-comments \
  > "$DUMP_FILE"
# Normalize for scratch restore (idempotent public schema creation).
sed -i.bak 's/^CREATE SCHEMA public;/CREATE SCHEMA IF NOT EXISTS public;/' "$DUMP_FILE" && rm -f "${DUMP_FILE}.bak"
log "Dump written: $(wc -l < "$DUMP_FILE") lines, $(du -h "$DUMP_FILE" | awk '{print $1}')"

# --- Step 2: storage payload snapshot ---------------------------------------
section "2/6 Snapshot storage payload volume"
"$DOCKER_BIN" exec "$STORAGE_CONTAINER" sh -c "cd '${STORAGE_ROOT}' && tar czf - ." > "$STORAGE_TAR"
log "Storage snapshot: $(du -h "$STORAGE_TAR" | awk '{print $1}')"

# --- Capture source metrics -------------------------------------------------
section "Capture source metrics"
SRC_COUNTS=()  # indexed parallel to ENTITIES (bash 3.2 compatible — no associative arrays)
for e in "${ENTITIES[@]}"; do
  label="${e%%|*}"; rel="${e##*|}"
  c="$(psql "$SUPABASE_DB_URL" -tAc "select count(*) from ${rel}")"
  SRC_COUNTS+=("$c")
  log "  source ${label}: ${c}"
done
SRC_FILE_COUNT="$("$DOCKER_BIN" exec "$STORAGE_CONTAINER" sh -c "find '${STORAGE_ROOT}' -type f | wc -l" | tr -d ' ')"
SAMPLE_REL="$("$DOCKER_BIN" exec "$STORAGE_CONTAINER" sh -c "cd '${STORAGE_ROOT}' && find . -type f | sort | head -1" | sed 's#^\./##')"
SRC_SAMPLE_SHA="$("$DOCKER_BIN" exec "$STORAGE_CONTAINER" sh -c "sha256sum '${STORAGE_ROOT}/${SAMPLE_REL}'" | awk '{print $1}')"
log "  source storage files: ${SRC_FILE_COUNT}"
log "  sample file: ${SAMPLE_REL}"
log "  sample sha256: ${SRC_SAMPLE_SHA}"

# --- Step 3: restore into disposable scratch DB -----------------------------
section "3/6 Restore into disposable scratch database"
"$DOCKER_BIN" exec "$DB_CONTAINER" psql "$CADMIN_URL" -v ON_ERROR_STOP=1 -q -c "DROP DATABASE IF EXISTS \"${SCRATCH_DB}\" WITH (FORCE);"
"$DOCKER_BIN" exec "$DB_CONTAINER" psql "$CADMIN_URL" -v ON_ERROR_STOP=1 -q -c "CREATE DATABASE \"${SCRATCH_DB}\";"
# auth/storage schemas reference the supabase roles; ensure they exist in scratch context.
"$DOCKER_BIN" exec -i "$DB_CONTAINER" psql "$CSCRATCH_URL" -v ON_ERROR_STOP=0 -q >/dev/null 2>&1 <<'SQL' || true
DO $$ BEGIN
  CREATE ROLE anon NOLOGIN NOINHERIT;            EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE ROLE authenticated NOLOGIN NOINHERIT;   EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE ROLE supabase_admin LOGIN CREATEROLE CREATEDB; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE ROLE supabase_auth_admin LOGIN CREATEROLE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE ROLE supabase_storage_admin LOGIN CREATEROLE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE ROLE authenticator NOINHERIT LOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
SQL
"$DOCKER_BIN" exec -i "$DB_CONTAINER" psql "$CSCRATCH_URL" -v ON_ERROR_STOP=1 -q -f - < "$DUMP_FILE" \
  > "${WORKDIR}/restore.out" 2> "${WORKDIR}/restore.err" || {
    echo "FATAL: restore failed; see ${WORKDIR}/restore.err" >&2
    tail -20 "${WORKDIR}/restore.err" >&2
    exit 1
  }
log "Restore completed into ${SCRATCH_DB}"

# --- Step 4: extract storage snapshot ---------------------------------------
section "4/6 Extract storage snapshot to disposable dir"
mkdir -p "$RESTORE_DIR"
tar xzf "$STORAGE_TAR" -C "$RESTORE_DIR"
RESTORED_FILE_COUNT="$(find "$RESTORE_DIR" -type f | wc -l | tr -d ' ')"
log "Extracted to ${RESTORE_DIR} (${RESTORED_FILE_COUNT} files)"

# --- Step 5: validation -----------------------------------------------------
section "5/6 Validate restored counts + checksum"
check() { # label expected actual
  if [[ "$2" == "$3" ]]; then log "  PASS  $1: $3"; else log "  FAIL  $1: expected $2, got $3"; FAILED=1; fi
}
for i in "${!ENTITIES[@]}"; do
  label="${ENTITIES[$i]%%|*}"; rel="${ENTITIES[$i]##*|}"
  restored="$(psql "$SCRATCH_DB_URL" -tAc "select count(*) from ${rel}")"
  check "$label" "${SRC_COUNTS[$i]}" "$restored"
done
check "storage_files" "$SRC_FILE_COUNT" "$RESTORED_FILE_COUNT"

RESTORED_SAMPLE_SHA="$(sha256_of "${RESTORE_DIR}/${SAMPLE_REL}")"
check "sample_checksum" "$SRC_SAMPLE_SHA" "$RESTORED_SAMPLE_SHA"

# --- Step 6: smoke checks beyond row counts ---------------------------------
section "6/6 Restored-environment smoke checks"

# Smoke A — referential integrity (relationships survived, not just cardinality).
ORPHAN_PARTS="$(psql "$SCRATCH_DB_URL" -tAc "select count(*) from public.parts p left join public.jobs j on j.id = p.job_id where j.id is null")"
check "no_orphan_parts" "0" "$ORPHAN_PARTS"
ORPHAN_JOBS="$(psql "$SCRATCH_DB_URL" -tAc "select count(*) from public.jobs j left join public.tenants t on t.id = j.tenant_id where t.id is null")"
check "no_orphan_jobs" "0" "$ORPHAN_JOBS"

# Smoke B — critical RLS helper function restored and intact (app tenant isolation depends on it).
HELPER_OK="$(psql "$SCRATCH_DB_URL" -tAc "select (pg_get_functiondef('public.get_user_tenant_id'::regproc) is not null)" 2>/dev/null || echo f)"
check "rls_helper_present" "t" "$HELPER_OK"

# Smoke C — pilot-tenant shape parity (a real tenant restored with its jobs/parts intact).
PILOT_ID=""; PILOT_JOBS=""; RES_PILOT_JOBS=""; RES_PILOT_PARTS=""
read -r PILOT_ID PILOT_JOBS < <(psql "$SUPABASE_DB_URL" -tAF' ' -c \
  "select t.id, count(j.id) from public.tenants t left join public.jobs j on j.tenant_id = t.id group by t.id order by count(j.id) desc limit 1") || true
if [[ -z "$PILOT_ID" ]]; then
  log "  SKIP  pilot_shape: source has no tenants (empty dataset)"
else
  SRC_PILOT_PARTS="$(psql "$SUPABASE_DB_URL" -tAc "select count(*) from public.parts p join public.jobs j on j.id=p.job_id where j.tenant_id='${PILOT_ID}'")"
  RES_PILOT_JOBS="$(psql "$SCRATCH_DB_URL" -tAc "select count(*) from public.jobs where tenant_id='${PILOT_ID}'")"
  RES_PILOT_PARTS="$(psql "$SCRATCH_DB_URL" -tAc "select count(*) from public.parts p join public.jobs j on j.id=p.job_id where j.tenant_id='${PILOT_ID}'")"
  log "  pilot tenant: ${PILOT_ID}"
  check "pilot_jobs" "$PILOT_JOBS" "$RES_PILOT_JOBS"
  check "pilot_parts" "$SRC_PILOT_PARTS" "$RES_PILOT_PARTS"
fi

# --- Report -----------------------------------------------------------------
ELAPSED="$(( $(date -u +%s) - START_EPOCH ))"
section "Result"
if [[ "$FAILED" -eq 0 ]]; then RESULT="PASS"; else RESULT="FAIL"; fi
log "Drill result: ${RESULT}"
log "Elapsed: ${ELAPSED}s"

if [[ -n "$LOG_PATH" ]]; then
  {
    echo "# Flow Restore Drill — ${TS}"
    echo
    echo "- Result: ${RESULT}"
    echo "- Elapsed: ${ELAPSED}s"
    echo "- Source DB: ${SUPABASE_DB_URL%@*}@(redacted)"
    echo "- Scratch DB: ${SCRATCH_DB}"
    echo "- Storage files: source ${SRC_FILE_COUNT} / restored ${RESTORED_FILE_COUNT}"
    echo "- Sample file: ${SAMPLE_REL}"
    echo "- Sample sha256: ${SRC_SAMPLE_SHA}"
    echo "- Pilot tenant: ${PILOT_ID} (jobs ${RES_PILOT_JOBS}, parts ${RES_PILOT_PARTS})"
  } > "$LOG_PATH"
  log "Log written: ${LOG_PATH}"
fi

[[ "$FAILED" -eq 0 ]] || exit 1
