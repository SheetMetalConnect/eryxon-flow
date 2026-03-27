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

# ── 5. POST Create (remaining endpoints) ─────────────────────────────────────
echo ""
echo -e "${B}── POST Create (remaining) ──${N}"

# Get an operation ID for issue/substep/time-entry/assignment creation
OP_ID=$(_curl "$BASE_URL/api-operations?limit=1" --header "$AUTH" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['operations'][0]['id'])" 2>/dev/null || echo "")
PART_ID=$(_curl "$BASE_URL/api-parts?limit=1" --header "$AUTH" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['parts'][0]['id'])" 2>/dev/null || echo "")

# Get a profile ID for created_by fields
PROFILE_ID=$(_curl "$BASE_URL/api-assignments?limit=1" --header "$AUTH" | python3 -c "
import sys,json
try:
  d=json.load(sys.stdin)
  # Try to get any profile from assignments or use Luke's ID
  print('96d587a6-995a-454f-ba71-773176012775')
except: print('96d587a6-995a-454f-ba71-773176012775')
" 2>/dev/null)

if [ -n "$OP_ID" ]; then
  # Create issue (status: pending/approved/rejected/closed, severity: low/medium/high/critical)
  assert_success "POST issue" "$BASE_URL/api-issues" -X POST --header "$AUTH" -H "Content-Type: application/json" \
    -d "{\"title\":\"Auto test issue $TS\",\"severity\":\"low\",\"status\":\"pending\",\"description\":\"Automated test\",\"operation_id\":\"$OP_ID\",\"created_by\":\"$PROFILE_ID\"}"

  # Create substep
  assert_success "POST substep" "$BASE_URL/api-substeps" -X POST --header "$AUTH" -H "Content-Type: application/json" \
    -d "{\"operation_id\":\"$OP_ID\",\"name\":\"Auto check $TS\",\"sequence\":99,\"status\":\"not_started\"}"

  # Create time entry (time_type: setup/run/rework/wait/breakdown)
  assert_success "POST time-entry" "$BASE_URL/api-time-entries" -X POST --header "$AUTH" -H "Content-Type: application/json" \
    -d "{\"operation_id\":\"$OP_ID\",\"operator_id\":\"$PROFILE_ID\",\"start_time\":\"$(date -u '+%Y-%m-%dT%H:%M:%SZ')\",\"time_type\":\"setup\"}"

  # Create scrap reason (category: material/process/equipment/operator/design/other)
  assert_success "POST scrap-reason" "$BASE_URL/api-scrap-reasons" -X POST --header "$AUTH" -H "Content-Type: application/json" \
    -d "{\"code\":\"AUTO-$TS\",\"description\":\"Auto test scrap\",\"category\":\"process\",\"active\":true}"

  # Create resource (type/status from resources table)
  assert_success "POST resource" "$BASE_URL/api-resources" -X POST --header "$AUTH" -H "Content-Type: application/json" \
    -d "{\"name\":\"Auto Fixture $TS\",\"type\":\"fixture\",\"status\":\"available\"}"

  # Create template
  assert_success "POST template" "$BASE_URL/api-templates" -X POST --header "$AUTH" -H "Content-Type: application/json" \
    -d "{\"name\":\"Auto Template $TS\",\"description\":\"Automated test\",\"operation_type\":\"laser\"}"

  # Upload URL (DXF)
  assert_success "POST upload-url (DXF)" "$BASE_URL/api-upload-url" -X POST --header "$AUTH" -H "Content-Type: application/json" \
    -d '{"filename":"auto-test.dxf","content_type":"application/dxf"}'

  # Upload URL (Excel)
  assert_success "POST upload-url (XLSX)" "$BASE_URL/api-upload-url" -X POST --header "$AUTH" -H "Content-Type: application/json" \
    -d '{"filename":"auto-test.xlsx","content_type":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}'
else
  echo -e "  ${Y}SKIP${N}  No operation ID available"
  SKIP=$((SKIP + 8))
fi

# ── 6. PATCH Update ──────────────────────────────────────────────────────────
echo ""
echo -e "${B}── PATCH Update ──${N}"

# Get IDs for patching
CELL_ID=$(_curl "$BASE_URL/api-cells?search=AUTO-TEST&limit=1" --header "$AUTH" | python3 -c "import sys,json; c=json.load(sys.stdin)['data']['cells']; print(c[0]['id'] if c else '')" 2>/dev/null || echo "")

if [ -n "$CELL_ID" ]; then
  assert_success "PATCH cell" "$BASE_URL/api-cells?id=$CELL_ID" -X PATCH --header "$AUTH" -H "Content-Type: application/json" \
    -d '{"color":"#00ff00"}'
fi

if [ -n "$JOB_ID" ]; then
  # Fetch a fresh not_started job for patching (the lifecycle one is completed)
  PATCH_JOB=$(_curl "$BASE_URL/api-jobs?status=not_started&limit=1" --header "$AUTH" | python3 -c "import sys,json; j=json.load(sys.stdin)['data']['jobs']; print(j[0]['id'] if j else '')" 2>/dev/null || echo "")
  if [ -n "$PATCH_JOB" ]; then
    assert_success "PATCH job" "$BASE_URL/api-jobs?id=$PATCH_JOB" -X PATCH --header "$AUTH" -H "Content-Type: application/json" \
      -d '{"notes":"Updated by automated test"}'
  fi
fi

if [ -n "$PART_ID" ]; then
  assert_success "PATCH part" "$BASE_URL/api-parts?id=$PART_ID" -X PATCH --header "$AUTH" -H "Content-Type: application/json" \
    -d '{"notes":"Auto test note"}'
fi

if [ -n "$OP_ID" ]; then
  assert_success "PATCH operation" "$BASE_URL/api-operations?id=$OP_ID" -X PATCH --header "$AUTH" -H "Content-Type: application/json" \
    -d '{"notes":"Auto test note"}'
fi

# ── 7. DELETE ─────────────────────────────────────────────────────────────────
echo ""
echo -e "${B}── DELETE ──${N}"

# Delete the test cell we created
if [ -n "$CELL_ID" ]; then
  assert_success "DELETE cell" "$BASE_URL/api-cells?id=$CELL_ID" -X DELETE --header "$AUTH"
fi

# Delete the test webhook
WH_ID=$(_curl "$BASE_URL/api-webhooks?limit=100" --header "$AUTH" | python3 -c "
import sys,json
whs=json.load(sys.stdin)['data']['webhooks']
for w in whs:
  if 'httpbin' in w.get('url',''):
    print(w['id']); break
" 2>/dev/null || echo "")
if [ -n "$WH_ID" ]; then
  assert_success "DELETE webhook" "$BASE_URL/api-webhooks?id=$WH_ID" -X DELETE --header "$AUTH"
fi

# ── 8. Job Lifecycle (full cycle) ────────────────────────────────────────────
echo ""
echo -e "${B}── Job Lifecycle ──${N}"

if [ -n "$JOB_ID" ]; then
  for action in start stop resume complete; do
    assert_success "LIFECYCLE job/$action" "$BASE_URL/api-job-lifecycle/$action?id=$JOB_ID" -X POST --header "$AUTH" -H "Content-Type: application/json"
  done
else
  echo -e "  ${Y}SKIP${N}  Job lifecycle (no job ID)"
  SKIP=$((SKIP + 4))
fi

# ── 9. Operation Lifecycle ───────────────────────────────────────────────────
echo ""
echo -e "${B}── Operation Lifecycle ──${N}"

# Get a not_started operation
OP_LC=$(_curl "$BASE_URL/api-operations?status=not_started&limit=1" --header "$AUTH" | python3 -c "import sys,json; ops=json.load(sys.stdin)['data']['operations']; print(ops[0]['id'] if ops else '')" 2>/dev/null || echo "")
if [ -n "$OP_LC" ]; then
  for action in start pause resume complete; do
    assert_success "LIFECYCLE op/$action" "$BASE_URL/api-operation-lifecycle/$action?id=$OP_LC" -X POST --header "$AUTH" -H "Content-Type: application/json"
  done
else
  echo -e "  ${Y}SKIP${N}  Operation lifecycle (no operation)"
  SKIP=$((SKIP + 4))
fi

# ── 10. ERP Sync ─────────────────────────────────────────────────────────────
echo ""
echo -e "${B}── ERP Sync ──${N}"

# ERP sync diff (dry-run)
assert_success "ERP sync diff" "$BASE_URL/api-erp-sync/diff" -X POST --header "$AUTH" -H "Content-Type: application/json" \
  -d '{"jobs":[{"external_id":"erp-test-001","job_number":"ERP-TEST-001","customer":"ERP Test"}]}'

# ── 11. File Upload (actual PUT) ─────────────────────────────────────────────
echo ""
echo -e "${B}── File Upload (actual) ──${N}"

UPLOAD_RESP=$(_curl "$BASE_URL/api-upload-url" -X POST --header "$AUTH" -H "Content-Type: application/json" \
  -d "{\"filename\":\"upload-test-$TS.txt\",\"content_type\":\"text/plain\"}")
UPLOAD_URL=$(echo "$UPLOAD_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['upload_url'])" 2>/dev/null || echo "")

if [ -n "$UPLOAD_URL" ]; then
  UPLOAD_HTTP=$(curl -s -w "%{http_code}" -o /dev/null --max-time 30 "$UPLOAD_URL" -X PUT -H "Content-Type: text/plain" -d "Automated test file content - $TS")
  TOTAL=$((TOTAL + 1))
  if [ "$UPLOAD_HTTP" = "200" ]; then
    echo -e "  ${G}PASS${N}  PUT file to signed URL (HTTP $UPLOAD_HTTP)"
    PASS=$((PASS + 1))
  else
    echo -e "  ${R}FAIL${N}  PUT file to signed URL (HTTP $UPLOAD_HTTP)"
    FAIL=$((FAIL + 1)); FAILURES="$FAILURES\n  PUT file upload: HTTP $UPLOAD_HTTP"
  fi
else
  echo -e "  ${Y}SKIP${N}  File upload (no signed URL)"
  SKIP=$((SKIP + 1))
fi

# ── 12. Rejected content types ───────────────────────────────────────────────
echo ""
echo -e "${B}── Validation ──${N}"

R=$(_curl "$BASE_URL/api-upload-url" -X POST --header "$AUTH" -H "Content-Type: application/json" \
  -d '{"filename":"evil.exe","content_type":"application/x-msdownload"}')
assert_rejected "Upload .exe rejected" "$R" "not allowed"

R=$(_curl "$BASE_URL/api-upload-url" -X POST --header "$AUTH" -H "Content-Type: application/json" \
  -d '{"filename":"../../../etc/passwd","content_type":"text/plain"}')
assert_rejected "Path traversal rejected" "$R" "invalid characters"

R=$(_curl "$BASE_URL/api-jobs" -X POST --header "$AUTH" -H "Content-Type: application/json" \
  -d '{}')
assert_rejected "Job without job_number rejected" "$R" "validation\|job_number\|required"

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
