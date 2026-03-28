#!/usr/bin/env bash
#
# Eryxon Flow - CSV Import E2E Test
#
# Tests the full CSV import pipeline: cells → jobs → parts → operations
# Uses the bulk-sync API endpoints (same as DataImport UI component).
#
# Usage:
#   export SUPABASE_URL="https://your-project.supabase.co"
#   export API_KEY="ery_live_xxxxxxxxxx"
#   ./scripts/test-csv-e2e.sh
#

set -euo pipefail

SUPABASE_URL="${SUPABASE_URL:?Set SUPABASE_URL environment variable}"
API_KEY="${API_KEY:?Set API_KEY environment variable}"
BASE_URL="${SUPABASE_URL}/functions/v1"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

PASSED=0
FAILED=0
TOTAL=0

api_call() {
  local method="$1"
  local endpoint="$2"
  local data="${3:-}"
  local url="${BASE_URL}/${endpoint}"

  local curl_args=(
    -s -w "\n%{http_code}"
    -X "$method"
    -H "Authorization: Bearer ${API_KEY}"
    -H "Content-Type: application/json"
  )

  if [[ -n "$data" ]]; then
    curl_args+=(-d "$data")
  fi

  curl "${curl_args[@]}" "$url"
}

get_status() { echo "$1" | tail -1; }
get_body() { echo "$1" | sed '$d'; }

assert_status() {
  local test_name="$1"
  local expected="$2"
  local actual="$3"
  local body="$4"
  TOTAL=$((TOTAL + 1))

  if [[ "$actual" == "$expected" ]]; then
    echo -e "  ${GREEN}✓${NC} $test_name (HTTP $actual)"
    PASSED=$((PASSED + 1))
  else
    echo -e "  ${RED}✗${NC} $test_name — expected $expected, got $actual"
    echo -e "    ${RED}Body: $(echo "$body" | head -c 200)${NC}"
    FAILED=$((FAILED + 1))
  fi
}

assert_json_field() {
  local test_name="$1"
  local body="$2"
  local field="$3"
  local expected="$4"
  TOTAL=$((TOTAL + 1))

  local actual
  actual=$(echo "$body" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d${field})" 2>/dev/null || echo "PARSE_ERROR")

  if [[ "$actual" == "$expected" ]]; then
    echo -e "  ${GREEN}✓${NC} $test_name = $actual"
    PASSED=$((PASSED + 1))
  else
    echo -e "  ${RED}✗${NC} $test_name — expected '$expected', got '$actual'"
    FAILED=$((FAILED + 1))
  fi
}

TS=$(date +%s)

echo -e "${BOLD}${CYAN}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  CSV Import E2E Test — Synthetic Data Pipeline"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${NC}"

# ── Step 1: Sync Cells ────────────────────────────────────────────────────────
echo -e "${CYAN}── Step 1: Bulk-sync cells ──${NC}"

CELLS_PAYLOAD='[
  {"external_id": "CSV-CELL-LASER-'$TS'", "external_source": "csv-test", "name": "Laser snijden", "sequence": 1, "color": "#ef4444"},
  {"external_id": "CSV-CELL-KANT-'$TS'", "external_source": "csv-test", "name": "CNC Kantbank", "sequence": 2, "color": "#f59e0b"},
  {"external_id": "CSV-CELL-LAS-'$TS'", "external_source": "csv-test", "name": "Lassen TIG", "sequence": 3, "color": "#3b82f6"},
  {"external_id": "CSV-CELL-AFW-'$TS'", "external_source": "csv-test", "name": "Afwerking", "sequence": 4, "color": "#10b981"}
]'

RESULT=$(api_call POST "api-cells/bulk-sync" "$CELLS_PAYLOAD")
STATUS=$(get_status "$RESULT")
BODY=$(get_body "$RESULT")
assert_status "Cells bulk-sync" "200" "$STATUS" "$BODY"
assert_json_field "Cells sync success" "$BODY" "['success']" "True"

# ── Step 2: Sync Jobs ─────────────────────────────────────────────────────────
echo -e "\n${CYAN}── Step 2: Bulk-sync jobs ──${NC}"

JOBS_PAYLOAD='[
  {"external_id": "CSV-JOB-001-'$TS'", "external_source": "csv-test", "job_number": "WO-CSV-001", "customer": "Testklant BV", "due_date": "2026-05-15", "status": "not_started"},
  {"external_id": "CSV-JOB-002-'$TS'", "external_source": "csv-test", "job_number": "WO-CSV-002", "customer": "Metaal Fabriek NL", "due_date": "2026-04-30", "status": "not_started"},
  {"external_id": "CSV-JOB-003-'$TS'", "external_source": "csv-test", "job_number": "WO-CSV-003", "customer": "Staalconstructie BV", "due_date": "2026-06-01", "status": "not_started"}
]'

RESULT=$(api_call POST "api-jobs/bulk-sync" "$JOBS_PAYLOAD")
STATUS=$(get_status "$RESULT")
BODY=$(get_body "$RESULT")
assert_status "Jobs bulk-sync" "200" "$STATUS" "$BODY"
assert_json_field "Jobs sync success" "$BODY" "['success']" "True"

# Extract created job IDs for parts
JOB1_ID=$(echo "$BODY" | python3 -c "import sys,json; r=json.load(sys.stdin); print([x['id'] for x in r.get('data',{}).get('results',[]) if 'CSV-JOB-001' in str(x.get('external_id',''))][0])" 2>/dev/null || echo "")
JOB2_ID=$(echo "$BODY" | python3 -c "import sys,json; r=json.load(sys.stdin); print([x['id'] for x in r.get('data',{}).get('results',[]) if 'CSV-JOB-002' in str(x.get('external_id',''))][0])" 2>/dev/null || echo "")
JOB3_ID=$(echo "$BODY" | python3 -c "import sys,json; r=json.load(sys.stdin); print([x['id'] for x in r.get('data',{}).get('results',[]) if 'CSV-JOB-003' in str(x.get('external_id',''))][0])" 2>/dev/null || echo "")

echo -e "  ${YELLOW}Job IDs: ${JOB1_ID:0:8}… ${JOB2_ID:0:8}… ${JOB3_ID:0:8}…${NC}"

# ── Step 3: Sync Parts ────────────────────────────────────────────────────────
echo -e "\n${CYAN}── Step 3: Bulk-sync parts ──${NC}"

if [[ -z "$JOB1_ID" ]]; then
  echo -e "  ${RED}✗ Skipping parts — no job IDs extracted${NC}"
  FAILED=$((FAILED + 1))
  TOTAL=$((TOTAL + 1))
else
  PARTS_PAYLOAD='[
    {"external_id": "CSV-PART-PLAAT-'$TS'", "external_source": "csv-test", "part_number": "PLAAT-S235-001", "job_id": "'$JOB1_ID'", "material": "S235", "quantity": 4},
    {"external_id": "CSV-PART-RVS-'$TS'", "external_source": "csv-test", "part_number": "RVS-304-DEKSEL", "job_id": "'$JOB1_ID'", "material": "RVS 304", "quantity": 8},
    {"external_id": "CSV-PART-ALU-'$TS'", "external_source": "csv-test", "part_number": "ALU-BRACKET-X2", "job_id": "'$JOB2_ID'", "material": "Aluminium 7075-T6", "quantity": 16},
    {"external_id": "CSV-PART-S355-'$TS'", "external_source": "csv-test", "part_number": "FRAME-S355-MAIN", "job_id": "'$JOB3_ID'", "material": "S355J2", "quantity": 2}
  ]'

  RESULT=$(api_call POST "api-parts/bulk-sync" "$PARTS_PAYLOAD")
  STATUS=$(get_status "$RESULT")
  BODY=$(get_body "$RESULT")
  assert_status "Parts bulk-sync" "200" "$STATUS" "$BODY"
  assert_json_field "Parts sync success" "$BODY" "['success']" "True"

  # Extract part IDs for operations
  PART1_ID=$(echo "$BODY" | python3 -c "import sys,json; r=json.load(sys.stdin); print([x['id'] for x in r.get('data',{}).get('results',[]) if 'PLAAT' in str(x.get('external_id',''))][0])" 2>/dev/null || echo "")
  PART2_ID=$(echo "$BODY" | python3 -c "import sys,json; r=json.load(sys.stdin); print([x['id'] for x in r.get('data',{}).get('results',[]) if 'RVS' in str(x.get('external_id',''))][0])" 2>/dev/null || echo "")
  PART3_ID=$(echo "$BODY" | python3 -c "import sys,json; r=json.load(sys.stdin); print([x['id'] for x in r.get('data',{}).get('results',[]) if 'ALU' in str(x.get('external_id',''))][0])" 2>/dev/null || echo "")
  PART4_ID=$(echo "$BODY" | python3 -c "import sys,json; r=json.load(sys.stdin); print([x['id'] for x in r.get('data',{}).get('results',[]) if 'S355' in str(x.get('external_id',''))][0])" 2>/dev/null || echo "")

  echo -e "  ${YELLOW}Part IDs: ${PART1_ID:0:8}… ${PART2_ID:0:8}… ${PART3_ID:0:8}… ${PART4_ID:0:8}…${NC}"
fi

# ── Step 4: Get Cell IDs for Operations ───────────────────────────────────────
echo -e "\n${CYAN}── Step 4: Resolve cell IDs ──${NC}"

CELLS_RESULT=$(api_call GET "api-cells?search=csv-test")
CELLS_BODY=$(get_body "$CELLS_RESULT")
CELL_LASER=$(echo "$CELLS_BODY" | python3 -c "import sys,json; r=json.load(sys.stdin); print([x['id'] for x in r.get('data',[]) if 'Laser' in x.get('name','')][0])" 2>/dev/null || echo "")
CELL_KANT=$(echo "$CELLS_BODY" | python3 -c "import sys,json; r=json.load(sys.stdin); print([x['id'] for x in r.get('data',[]) if 'Kantbank' in x.get('name','')][0])" 2>/dev/null || echo "")
CELL_LAS=$(echo "$CELLS_BODY" | python3 -c "import sys,json; r=json.load(sys.stdin); print([x['id'] for x in r.get('data',[]) if 'TIG' in x.get('name','')][0])" 2>/dev/null || echo "")
CELL_AFW=$(echo "$CELLS_BODY" | python3 -c "import sys,json; r=json.load(sys.stdin); print([x['id'] for x in r.get('data',[]) if 'Afwerking' in x.get('name','')][0])" 2>/dev/null || echo "")

echo -e "  ${YELLOW}Cell IDs: Laser=${CELL_LASER:0:8}… Kant=${CELL_KANT:0:8}… Las=${CELL_LAS:0:8}… Afw=${CELL_AFW:0:8}…${NC}"

# ── Step 5: Sync Operations ───────────────────────────────────────────────────
echo -e "\n${CYAN}── Step 5: Bulk-sync operations ──${NC}"

if [[ -z "$PART1_ID" || -z "$CELL_LASER" ]]; then
  echo -e "  ${RED}✗ Skipping operations — missing part or cell IDs${NC}"
  FAILED=$((FAILED + 1))
  TOTAL=$((TOTAL + 1))
else
  OPS_PAYLOAD='[
    {"external_id": "CSV-OP-001-'$TS'", "external_source": "csv-test", "operation_name": "Lasersnijden", "part_id": "'$PART1_ID'", "cell_id": "'$CELL_LASER'", "sequence": 1, "estimated_time": 120, "status": "not_started"},
    {"external_id": "CSV-OP-002-'$TS'", "external_source": "csv-test", "operation_name": "Kanten", "part_id": "'$PART1_ID'", "cell_id": "'$CELL_KANT'", "sequence": 2, "estimated_time": 90, "status": "not_started"},
    {"external_id": "CSV-OP-003-'$TS'", "external_source": "csv-test", "operation_name": "Lassen", "part_id": "'$PART1_ID'", "cell_id": "'$CELL_LAS'", "sequence": 3, "estimated_time": 180, "status": "not_started"},
    {"external_id": "CSV-OP-004-'$TS'", "external_source": "csv-test", "operation_name": "Afwerking", "part_id": "'$PART1_ID'", "cell_id": "'$CELL_AFW'", "sequence": 4, "estimated_time": 45, "status": "not_started"},
    {"external_id": "CSV-OP-005-'$TS'", "external_source": "csv-test", "operation_name": "Lasersnijden", "part_id": "'$PART2_ID'", "cell_id": "'$CELL_LASER'", "sequence": 1, "estimated_time": 60, "status": "not_started"},
    {"external_id": "CSV-OP-006-'$TS'", "external_source": "csv-test", "operation_name": "Kanten", "part_id": "'$PART2_ID'", "cell_id": "'$CELL_KANT'", "sequence": 2, "estimated_time": 45, "status": "not_started"},
    {"external_id": "CSV-OP-007-'$TS'", "external_source": "csv-test", "operation_name": "Lasersnijden", "part_id": "'$PART3_ID'", "cell_id": "'$CELL_LASER'", "sequence": 1, "estimated_time": 200, "status": "not_started"},
    {"external_id": "CSV-OP-008-'$TS'", "external_source": "csv-test", "operation_name": "Kanten", "part_id": "'$PART3_ID'", "cell_id": "'$CELL_KANT'", "sequence": 2, "estimated_time": 150, "status": "not_started"},
    {"external_id": "CSV-OP-009-'$TS'", "external_source": "csv-test", "operation_name": "Lasersnijden", "part_id": "'$PART4_ID'", "cell_id": "'$CELL_LASER'", "sequence": 1, "estimated_time": 300, "status": "not_started"},
    {"external_id": "CSV-OP-010-'$TS'", "external_source": "csv-test", "operation_name": "Lassen", "part_id": "'$PART4_ID'", "cell_id": "'$CELL_LAS'", "sequence": 2, "estimated_time": 480, "status": "not_started"},
    {"external_id": "CSV-OP-011-'$TS'", "external_source": "csv-test", "operation_name": "Afwerking", "part_id": "'$PART4_ID'", "cell_id": "'$CELL_AFW'", "sequence": 3, "estimated_time": 60, "status": "not_started"}
  ]'

  RESULT=$(api_call POST "api-operations/bulk-sync" "$OPS_PAYLOAD")
  STATUS=$(get_status "$RESULT")
  BODY=$(get_body "$RESULT")
  assert_status "Operations bulk-sync" "200" "$STATUS" "$BODY"
  assert_json_field "Operations sync success" "$BODY" "['success']" "True"
fi

# ── Step 6: Verify data ───────────────────────────────────────────────────────
echo -e "\n${CYAN}── Step 6: Verify imported data ──${NC}"

# Verify jobs
RESULT=$(api_call GET "api-jobs?search=WO-CSV")
STATUS=$(get_status "$RESULT")
BODY=$(get_body "$RESULT")
assert_status "List CSV jobs" "200" "$STATUS" "$BODY"

JOB_COUNT=$(echo "$BODY" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('data',[])))" 2>/dev/null || echo "0")
TOTAL=$((TOTAL + 1))
if [[ "$JOB_COUNT" -ge 3 ]]; then
  echo -e "  ${GREEN}✓${NC} Found $JOB_COUNT jobs (expected >= 3)"
  PASSED=$((PASSED + 1))
else
  echo -e "  ${RED}✗${NC} Found $JOB_COUNT jobs (expected >= 3)"
  FAILED=$((FAILED + 1))
fi

# Verify parts
RESULT=$(api_call GET "api-parts?search=PLAAT")
STATUS=$(get_status "$RESULT")
BODY=$(get_body "$RESULT")
assert_status "List CSV parts" "200" "$STATUS" "$BODY"

# Verify operations
RESULT=$(api_call GET "api-operations?status=not_started")
STATUS=$(get_status "$RESULT")
BODY=$(get_body "$RESULT")
assert_status "List operations" "200" "$STATUS" "$BODY"

# ── Step 7: Idempotency — re-sync same data ──────────────────────────────────
echo -e "\n${CYAN}── Step 7: Idempotency test (re-sync) ──${NC}"

RESULT=$(api_call POST "api-jobs/bulk-sync" "$JOBS_PAYLOAD")
STATUS=$(get_status "$RESULT")
BODY=$(get_body "$RESULT")
assert_status "Jobs re-sync (idempotent)" "200" "$STATUS" "$BODY"
assert_json_field "Jobs re-sync success" "$BODY" "['success']" "True"

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  ${GREEN}Passed: $PASSED${NC}  ${RED}Failed: $FAILED${NC}  Total: $TOTAL"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [[ $FAILED -gt 0 ]]; then
  exit 1
fi
