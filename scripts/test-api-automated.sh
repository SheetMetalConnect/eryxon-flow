#!/usr/bin/env bash
#
# Eryxon Flow — Automated API Test Suite
#
# Tests all edge function endpoints against the production Supabase instance.
# Run after deploying edge functions to validate everything works.
#
# Usage:
#   ./scripts/test-api-automated.sh
#
# Environment (reads from test.env if present):
#   SUPABASE_URL    — e.g. https://vatgianzotsurljznsry.supabase.co
#   API_KEY         — e.g. ery_live_xxxxx
#
# Options:
#   --verbose       Show response bodies
#   --stop          Stop on first failure
#

set -euo pipefail

# ── Load config ───────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

if [ -f "$ROOT_DIR/test.env" ]; then
  # shellcheck disable=SC1091
  set -a; source "$ROOT_DIR/test.env"; set +a
fi

: "${SUPABASE_URL:?Set SUPABASE_URL in test.env or environment}"
: "${API_KEY:?Set API_KEY in test.env or environment}"

BASE_URL="${SUPABASE_URL}/functions/v1"
AUTH="Authorization: Bearer $API_KEY"

# ── Options ───────────────────────────────────────────────────────────────────
VERBOSE=false
STOP_ON_FAIL=false
for arg in "$@"; do
  case "$arg" in
    --verbose) VERBOSE=true ;;
    --stop) STOP_ON_FAIL=true ;;
  esac
done

# ── Counters ──────────────────────────────────────────────────────────────────
PASS=0; FAIL=0; SKIP=0; TOTAL=0
FAILURES=""

# ── Colors ────────────────────────────────────────────────────────────────────
G='\033[0;32m'; R='\033[0;31m'; Y='\033[0;33m'; C='\033[0;36m'; B='\033[1m'; N='\033[0m'

# ── Test helpers ──────────────────────────────────────────────────────────────
_curl() {
  curl -s --max-time 30 "$@" 2>&1
}

assert_success() {
  local name="$1"
  shift
  # Build curl args array properly
  local -a args=("$@")
  local response
  response=$(curl -s --max-time 30 "${args[@]}" 2>&1)
  TOTAL=$((TOTAL + 1))

  if echo "$response" | grep -q '"success":true'; then
    echo -e "  ${G}PASS${N}  $name"
    PASS=$((PASS + 1))
  elif [ -z "$response" ] || [ "$response" = "null" ]; then
    sleep 5
    response=$(curl -s --max-time 30 "${args[@]}" 2>&1)
    if echo "$response" | grep -q '"success":true'; then
      echo -e "  ${G}PASS${N}  $name ${Y}(retry)${N}"
      PASS=$((PASS + 1))
    else
      echo -e "  ${R}FAIL${N}  $name — null response"
      FAIL=$((FAIL + 1)); FAILURES="$FAILURES\n  $name: null"
      $STOP_ON_FAIL && exit 1
    fi
  else
    local msg
    msg=$(echo "$response" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('error',{}).get('message','unknown')[:80])" 2>/dev/null || echo "parse error")
    echo -e "  ${R}FAIL${N}  $name — $msg"
    FAIL=$((FAIL + 1)); FAILURES="$FAILURES\n  $name: $msg"
    $VERBOSE && echo "    $response" | head -c 300
    $STOP_ON_FAIL && exit 1
  fi
}

assert_rejected() {
  local name="$1" response="$2" expected="$3"
  TOTAL=$((TOTAL + 1))

  if echo "$response" | grep -q "$expected"; then
    echo -e "  ${G}PASS${N}  $name"
    PASS=$((PASS + 1))
  else
    echo -e "  ${R}FAIL${N}  $name — expected '$expected'"
    FAIL=$((FAIL + 1))
    FAILURES="$FAILURES\n  $name: expected '$expected'"
  fi
}

# ── Start ─────────────────────────────────────────────────────────────────────
TS=$(date +%s)

echo ""
echo -e "${B}════════════════════════════════════════════════════${N}"
echo -e "${B}  Eryxon Flow — Automated API Test Suite${N}"
echo -e "  ${C}$(date '+%Y-%m-%d %H:%M:%S')${N}"
echo -e "  Base: $BASE_URL"
echo -e "${B}════════════════════════════════════════════════════${N}"

# ── 1. Authentication ─────────────────────────────────────────────────────────
echo ""
echo -e "${B}── Authentication ──${N}"

R=$(_curl "$BASE_URL/api-cells")
assert_rejected "No auth header → rejected" "$R" "Missing or invalid"

R=$(_curl "$BASE_URL/api-cells" -H "Authorization: Bearer ery_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxx")
assert_rejected "Bad API key → rejected" "$R" "Invalid API key"

R=$(_curl "$BASE_URL/api-cells" -H "Authorization: Bearer not_ery_format_key")
assert_rejected "Wrong key format → rejected" "$R" "Invalid API key"

assert_success "Valid API key → accepted" "$BASE_URL/api-cells" --header "$AUTH"

# ── 2. GET Endpoints ──────────────────────────────────────────────────────────
echo ""
echo -e "${B}── GET Endpoints (15) ──${N}"

for ep in api-cells api-jobs api-parts api-operations api-resources api-materials \
          api-templates api-scrap-reasons api-issues api-substeps api-assignments \
          api-time-entries api-webhooks api-webhook-logs api-operation-quantities; do
  assert_success "GET $ep" "$BASE_URL/$ep?limit=3" --header "$AUTH"
done

# ── 3. Search & Filter ───────────────────────────────────────────────────────
echo ""
echo -e "${B}── Search & Filter ──${N}"

assert_success "Search cells (Laser)" "$BASE_URL/api-cells?search=Laser" --header "$AUTH"
assert_success "Filter jobs (in_progress)" "$BASE_URL/api-jobs?status=in_progress" --header "$AUTH"
assert_success "Sort + paginate jobs" "$BASE_URL/api-jobs?sort=created_at&direction=desc&limit=2" --header "$AUTH"

# ── 4. POST Create ───────────────────────────────────────────────────────────
echo ""
echo -e "${B}── POST Create ──${N}"

# Create cell
assert_success "POST cell" "$BASE_URL/api-cells" -X POST --header "$AUTH" -H "Content-Type: application/json" \
  -d "{\"name\":\"AUTO-TEST-$TS\",\"color\":\"#ff9900\",\"sequence\":99}"

# Create job with nested parts + operations (use known Laser cell ID)
assert_success "POST job (nested)" "$BASE_URL/api-jobs" -X POST --header "$AUTH" -H "Content-Type: application/json" \
  -d "{\"job_number\":\"AUTO-$TS\",\"customer\":\"Automated Test\",\"due_date\":\"2026-07-01\",\"parts\":[{\"part_number\":\"AUTO-P1-$TS\",\"material\":\"RVS 304\",\"quantity\":10,\"operations\":[{\"operation_name\":\"Laser\",\"sequence\":1,\"estimated_time\":30,\"cell_id\":\"7abe2220-3a8e-4063-93f5-28ebe8daf840\"}]}]}"

# Get the job ID for lifecycle tests
JOB_ID=$(_curl "$BASE_URL/api-jobs?search=AUTO-$TS&limit=1" --header "$AUTH" | python3 -c "import sys,json; j=json.load(sys.stdin)['data']['jobs']; print(j[0]['id'] if j else '')" 2>/dev/null || echo "")

assert_success "POST webhook" "$BASE_URL/api-webhooks" -X POST --header "$AUTH" -H "Content-Type: application/json" \
  -d "{\"url\":\"https://httpbin.org/post\",\"events\":[\"job.created\"],\"active\":true,\"secret_key\":\"auto-$TS\"}"

assert_success "POST upload-url (PDF)" "$BASE_URL/api-upload-url" -X POST --header "$AUTH" -H "Content-Type: application/json" \
  -d '{"filename":"auto-test.pdf","content_type":"application/pdf"}'

assert_success "POST upload-url (STEP)" "$BASE_URL/api-upload-url" -X POST --header "$AUTH" -H "Content-Type: application/json" \
  -d '{"filename":"auto-test.stp","content_type":"application/octet-stream"}'

# ── 5. Lifecycle ──────────────────────────────────────────────────────────────
echo ""
echo -e "${B}── Job Lifecycle ──${N}"

if [ -n "$JOB_ID" ]; then
  for action in start stop resume complete; do
    assert_success "LIFECYCLE $action" "$BASE_URL/api-job-lifecycle/$action?id=$JOB_ID" -X POST --header "$AUTH" -H "Content-Type: application/json"
  done
else
  echo -e "  ${Y}SKIP${N}  Lifecycle (no job ID)"
  SKIP=$((SKIP + 4))
fi

# ── Results ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${B}════════════════════════════════════════════════════${N}"
TOTAL_RUN=$((PASS + FAIL))
if [ "$FAIL" -eq 0 ]; then
  echo -e "  ${G}ALL $PASS TESTS PASSED${N} ($SKIP skipped)"
else
  PCT=$((PASS * 100 / TOTAL_RUN))
  echo -e "  ${R}$FAIL FAILED${N} / ${G}$PASS passed${N} / $SKIP skipped ($PCT%)"
  echo -e "\n${R}Failures:${N}$FAILURES"
fi
echo -e "${B}════════════════════════════════════════════════════${N}"

# Exit with failure code if any tests failed
[ "$FAIL" -eq 0 ] || exit 1
