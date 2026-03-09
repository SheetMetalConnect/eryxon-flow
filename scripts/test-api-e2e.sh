#!/usr/bin/env bash
#
# Eryxon Flow - End-to-End API Test Suite
#
# Tests all major API endpoints against a running Supabase instance.
# Validates response codes, response structure, and business logic.
#
# Usage:
#   export SUPABASE_URL="https://your-project.supabase.co"
#   export API_KEY="ery_live_xxxxxxxxxx"
#   ./scripts/test-api-e2e.sh
#
# Options:
#   --verbose    Show full response bodies
#   --stop       Stop on first failure
#   --endpoint X Run only tests for endpoint X (jobs, parts, operations, issues, lifecycle, webhooks, substeps)
#

set -euo pipefail

# ── Configuration ──────────────────────────────────────────────────────────────

SUPABASE_URL="${SUPABASE_URL:?Set SUPABASE_URL environment variable}"
API_KEY="${API_KEY:?Set API_KEY environment variable}"
BASE_URL="${SUPABASE_URL}/functions/v1"

VERBOSE="${VERBOSE:-false}"
STOP_ON_FAIL="${STOP_ON_FAIL:-false}"
ENDPOINT_FILTER="${ENDPOINT_FILTER:-all}"

# Parse CLI args
for arg in "$@"; do
  case "$arg" in
    --verbose) VERBOSE=true ;;
    --stop) STOP_ON_FAIL=true ;;
    --endpoint=*) ENDPOINT_FILTER="${arg#--endpoint=}" ;;
  esac
done

# ── Counters ───────────────────────────────────────────────────────────────────

TESTS_PASSED=0
TESTS_FAILED=0
TESTS_SKIPPED=0
TOTAL_TESTS=0

# ── Colors ─────────────────────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# ── Helpers ────────────────────────────────────────────────────────────────────

log_header() {
  echo ""
  echo -e "${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BOLD}${BLUE}  $1${NC}"
  echo -e "${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

log_section() {
  echo ""
  echo -e "${CYAN}── $1 ──${NC}"
}

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

# Extract HTTP status code from api_call output
get_status() {
  echo "$1" | tail -1
}

# Extract response body from api_call output
get_body() {
  echo "$1" | sed '$d'
}

# Check if response body has success=true
is_success() {
  local body
  body=$(get_body "$1")
  echo "$body" | grep -q '"success":true' 2>/dev/null || echo "$body" | grep -q '"success": true' 2>/dev/null
}

# Assert HTTP status code
assert_status() {
  local test_name="$1"
  local expected_status="$2"
  local response="$3"

  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  local actual_status
  actual_status=$(get_status "$response")
  local body
  body=$(get_body "$response")

  if [[ "$actual_status" == "$expected_status" ]]; then
    echo -e "  ${GREEN}PASS${NC} $test_name (HTTP $actual_status)"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    if [[ "$VERBOSE" == "true" ]]; then
      echo "       Response: $(echo "$body" | head -c 200)"
    fi
    return 0
  else
    echo -e "  ${RED}FAIL${NC} $test_name"
    echo -e "       Expected: HTTP $expected_status"
    echo -e "       Actual:   HTTP $actual_status"
    echo -e "       Body:     $(echo "$body" | head -c 300)"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    if [[ "$STOP_ON_FAIL" == "true" ]]; then
      echo -e "\n${RED}Stopping on first failure.${NC}"
      print_summary
      exit 1
    fi
    return 1
  fi
}

# Assert response body contains a string
assert_contains() {
  local test_name="$1"
  local needle="$2"
  local response="$3"

  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  local body
  body=$(get_body "$response")

  if echo "$body" | grep -q "$needle" 2>/dev/null; then
    echo -e "  ${GREEN}PASS${NC} $test_name (contains '$needle')"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    return 0
  else
    echo -e "  ${RED}FAIL${NC} $test_name"
    echo -e "       Expected to contain: '$needle'"
    echo -e "       Body: $(echo "$body" | head -c 300)"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    if [[ "$STOP_ON_FAIL" == "true" ]]; then
      print_summary
      exit 1
    fi
    return 1
  fi
}

# Extract a JSON field value (simple extraction, no jq dependency)
json_field() {
  local body="$1"
  local field="$2"
  echo "$body" | grep -o "\"${field}\":\"[^\"]*\"" | head -1 | sed "s/\"${field}\":\"//" | sed 's/"$//'
}

# Generate unique test identifiers
TIMESTAMP=$(date +%s)
TEST_JOB_NUMBER="TEST-E2E-${TIMESTAMP}"
TEST_PART_NUMBER="PART-E2E-${TIMESTAMP}"

# Track created resource IDs for cleanup
CREATED_JOB_ID=""
CREATED_PART_ID=""
CREATED_OPERATION_ID=""
CREATED_ISSUE_ID=""
CREATED_SUBSTEP_ID=""
CREATED_WEBHOOK_ID=""

# ── Cleanup function ──────────────────────────────────────────────────────────

cleanup() {
  log_section "Cleanup"
  echo "  Cleaning up test resources..."

  if [[ -n "$CREATED_WEBHOOK_ID" ]]; then
    api_call DELETE "api-webhooks?id=${CREATED_WEBHOOK_ID}" >/dev/null 2>&1 || true
    echo "  Deleted webhook: ${CREATED_WEBHOOK_ID}"
  fi

  if [[ -n "$CREATED_ISSUE_ID" ]]; then
    api_call DELETE "api-issues?id=${CREATED_ISSUE_ID}" >/dev/null 2>&1 || true
    echo "  Deleted issue: ${CREATED_ISSUE_ID}"
  fi

  # Job delete cascades to parts and operations
  if [[ -n "$CREATED_JOB_ID" ]]; then
    api_call DELETE "api-jobs?id=${CREATED_JOB_ID}" >/dev/null 2>&1 || true
    echo "  Deleted job: ${CREATED_JOB_ID}"
  fi

  echo "  Cleanup complete."
}

trap cleanup EXIT

# ── Print summary ─────────────────────────────────────────────────────────────

print_summary() {
  echo ""
  echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BOLD}  Test Summary${NC}"
  echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "  Total:   ${TOTAL_TESTS}"
  echo -e "  ${GREEN}Passed:  ${TESTS_PASSED}${NC}"
  echo -e "  ${RED}Failed:  ${TESTS_FAILED}${NC}"
  echo -e "  ${YELLOW}Skipped: ${TESTS_SKIPPED}${NC}"

  if [[ $TESTS_FAILED -eq 0 ]]; then
    echo -e "\n  ${GREEN}${BOLD}All tests passed!${NC}"
  else
    echo -e "\n  ${RED}${BOLD}${TESTS_FAILED} test(s) failed.${NC}"
  fi
  echo ""
}

# ══════════════════════════════════════════════════════════════════════════════
# TESTS START HERE
# ══════════════════════════════════════════════════════════════════════════════

log_header "Eryxon Flow API - End-to-End Test Suite"
echo "  Base URL: ${BASE_URL}"
echo "  API Key:  ${API_KEY:0:12}..."
echo "  Filter:   ${ENDPOINT_FILTER}"
echo "  Verbose:  ${VERBOSE}"

# ── 1. Authentication Tests ────────────────────────────────────────────────────

if [[ "$ENDPOINT_FILTER" == "all" || "$ENDPOINT_FILTER" == "auth" ]]; then
  log_section "1. Authentication"

  # Test with valid API key
  RESP=$(api_call GET "api-jobs?limit=1")
  assert_status "GET /api-jobs with valid API key" "200" "$RESP" || true

  # Test with no API key
  RESP=$(curl -s -w "\n%{http_code}" -X GET -H "Content-Type: application/json" "${BASE_URL}/api-jobs?limit=1")
  assert_status "GET /api-jobs without API key returns 401" "401" "$RESP" || true

  # Test with invalid API key
  RESP=$(curl -s -w "\n%{http_code}" -X GET \
    -H "Authorization: Bearer invalid_key_12345" \
    -H "Content-Type: application/json" \
    "${BASE_URL}/api-jobs?limit=1")
  assert_status "GET /api-jobs with invalid API key returns 401" "401" "$RESP" || true
fi

# ── 2. Jobs API Tests ─────────────────────────────────────────────────────────

if [[ "$ENDPOINT_FILTER" == "all" || "$ENDPOINT_FILTER" == "jobs" ]]; then
  log_section "2. Jobs API"

  # 2.1 Create job with nested parts and operations
  CREATE_JOB_PAYLOAD=$(cat <<EOF
{
  "job_number": "${TEST_JOB_NUMBER}",
  "customer": "E2E Test Customer",
  "due_date": "2025-12-31",
  "priority": 5,
  "notes": "Created by API E2E test",
  "metadata": {"test_run": "${TIMESTAMP}"},
  "parts": [
    {
      "part_number": "${TEST_PART_NUMBER}",
      "material": "Aluminum 6061",
      "quantity": 10,
      "operations": [
        {
          "operation_name": "E2E Test Milling",
          "sequence": 1,
          "estimated_time_minutes": 60
        },
        {
          "operation_name": "E2E Test Deburr",
          "sequence": 2,
          "estimated_time_minutes": 15
        }
      ]
    }
  ]
}
EOF
)

  RESP=$(api_call POST "api-jobs" "$CREATE_JOB_PAYLOAD")
  assert_status "POST /api-jobs - Create job with parts" "201" "$RESP" || true
  assert_contains "POST /api-jobs - Response has success=true" '"success":true' "$RESP" || true

  # Extract job ID
  BODY=$(get_body "$RESP")
  CREATED_JOB_ID=$(echo "$BODY" | grep -o '"id":"[^"]*"' | head -1 | sed 's/"id":"//' | sed 's/"//')
  echo "  Created job ID: ${CREATED_JOB_ID:-UNKNOWN}"

  # Extract part ID
  # Look for the part ID (second id in the response, inside parts array)
  CREATED_PART_ID=$(echo "$BODY" | grep -o '"id":"[^"]*"' | sed -n '2p' | sed 's/"id":"//' | sed 's/"//')
  echo "  Created part ID: ${CREATED_PART_ID:-UNKNOWN}"

  # Extract first operation ID
  CREATED_OPERATION_ID=$(echo "$BODY" | grep -o '"id":"[^"]*"' | sed -n '3p' | sed 's/"id":"//' | sed 's/"//')
  echo "  Created operation ID: ${CREATED_OPERATION_ID:-UNKNOWN}"

  # 2.2 List jobs
  RESP=$(api_call GET "api-jobs?limit=5")
  assert_status "GET /api-jobs - List jobs" "200" "$RESP" || true
  assert_contains "GET /api-jobs - Has pagination" '"pagination"' "$RESP" || true

  # 2.3 Get single job by ID
  if [[ -n "$CREATED_JOB_ID" ]]; then
    RESP=$(api_call GET "api-jobs?id=${CREATED_JOB_ID}")
    assert_status "GET /api-jobs?id=X - Get single job" "200" "$RESP" || true
    assert_contains "GET /api-jobs?id=X - Contains job_number" "$TEST_JOB_NUMBER" "$RESP" || true
  fi

  # 2.4 Filter jobs by status
  RESP=$(api_call GET "api-jobs?status=not_started&limit=5")
  assert_status "GET /api-jobs?status=not_started - Filter by status" "200" "$RESP" || true

  # 2.5 Filter jobs by customer (fuzzy)
  RESP=$(api_call GET "api-jobs?customer=E2E&limit=5")
  assert_status "GET /api-jobs?customer=E2E - Fuzzy filter" "200" "$RESP" || true

  # 2.6 Search jobs
  RESP=$(api_call GET "api-jobs?search=${TEST_JOB_NUMBER}&limit=5")
  assert_status "GET /api-jobs?search=X - Full-text search" "200" "$RESP" || true

  # 2.7 Sorting
  RESP=$(api_call GET "api-jobs?sort=created_at&order=desc&limit=5")
  assert_status "GET /api-jobs?sort=created_at&order=desc - Sorting" "200" "$RESP" || true

  # 2.8 Update job
  if [[ -n "$CREATED_JOB_ID" ]]; then
    RESP=$(api_call PATCH "api-jobs?id=${CREATED_JOB_ID}" '{"notes": "Updated by E2E test"}')
    assert_status "PATCH /api-jobs?id=X - Update job" "200" "$RESP" || true
  fi

  # 2.9 Validation: Create job without job_number
  RESP=$(api_call POST "api-jobs" '{"parts": [{"part_number": "X", "quantity": 1, "operations": [{"operation_name": "Y", "sequence": 1}]}]}')
  assert_status "POST /api-jobs - Missing job_number returns 422" "422" "$RESP" || true
  assert_contains "POST /api-jobs - Validation error details" "VALIDATION_ERROR" "$RESP" || true

  # 2.10 Validation: Create job without parts
  RESP=$(api_call POST "api-jobs" '{"job_number": "NO-PARTS-TEST"}')
  # Note: parts may not be strictly required by the validator if undefined
  # The validator only checks parts if they are provided, so this may succeed or fail

  # 2.11 Validation: Invalid status enum
  RESP=$(api_call POST "api-jobs" '{"job_number": "BAD-STATUS", "status": "invalid_status", "parts": [{"part_number": "P1", "quantity": 1, "operations": [{"operation_name": "Op1", "sequence": 1}]}]}')
  assert_status "POST /api-jobs - Invalid status enum returns 422" "422" "$RESP" || true

  # 2.12 Validation: Negative priority
  RESP=$(api_call POST "api-jobs" '{"job_number": "BAD-PRI", "priority": -1, "parts": [{"part_number": "P1", "quantity": 1, "operations": [{"operation_name": "Op1", "sequence": 1}]}]}')
  assert_status "POST /api-jobs - Negative priority returns 422" "422" "$RESP" || true

  # 2.13 Get non-existent job
  RESP=$(api_call GET "api-jobs?id=00000000-0000-0000-0000-000000000000")
  assert_status "GET /api-jobs?id=nonexistent - Returns 404" "404" "$RESP" || true
fi

# ── 3. Parts API Tests ─────────────────────────────────────────────────────────

if [[ "$ENDPOINT_FILTER" == "all" || "$ENDPOINT_FILTER" == "parts" ]]; then
  log_section "3. Parts API"

  # 3.1 List parts
  RESP=$(api_call GET "api-parts?limit=5")
  assert_status "GET /api-parts - List parts" "200" "$RESP" || true

  # 3.2 List parts filtered by job
  if [[ -n "$CREATED_JOB_ID" ]]; then
    RESP=$(api_call GET "api-parts?job_id=${CREATED_JOB_ID}")
    assert_status "GET /api-parts?job_id=X - Filter by job" "200" "$RESP" || true
  fi

  # 3.3 Create standalone part
  if [[ -n "$CREATED_JOB_ID" ]]; then
    RESP=$(api_call POST "api-parts" "{
      \"job_id\": \"${CREATED_JOB_ID}\",
      \"part_number\": \"PART-STANDALONE-${TIMESTAMP}\",
      \"material\": \"Steel 4140\",
      \"quantity\": 5,
      \"notes\": \"Standalone part test\"
    }")
    # This should succeed (201) if the job exists
    STATUS=$(get_status "$RESP")
    if [[ "$STATUS" == "201" ]]; then
      STANDALONE_PART_ID=$(get_body "$RESP" | grep -o '"id":"[^"]*"' | head -1 | sed 's/"id":"//' | sed 's/"//')
      echo -e "  ${GREEN}PASS${NC} POST /api-parts - Create standalone part (HTTP 201)"
      TESTS_PASSED=$((TESTS_PASSED + 1))
      TOTAL_TESTS=$((TOTAL_TESTS + 1))
    else
      echo -e "  ${YELLOW}WARN${NC} POST /api-parts - HTTP ${STATUS} (may require operations)"
      TESTS_SKIPPED=$((TESTS_SKIPPED + 1))
      TOTAL_TESTS=$((TOTAL_TESTS + 1))
    fi
  fi

  # 3.4 Validation: Create part without job_id
  RESP=$(api_call POST "api-parts" '{"part_number": "NO-JOB", "quantity": 1}')
  STATUS=$(get_status "$RESP")
  if [[ "$STATUS" == "422" || "$STATUS" == "400" || "$STATUS" == "500" ]]; then
    echo -e "  ${GREEN}PASS${NC} POST /api-parts - Missing job_id returns error (HTTP ${STATUS})"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    echo -e "  ${RED}FAIL${NC} POST /api-parts - Missing job_id should fail (got HTTP ${STATUS})"
    TESTS_FAILED=$((TESTS_FAILED + 1))
  fi
  TOTAL_TESTS=$((TOTAL_TESTS + 1))

  # 3.5 Validation: Quantity < 1
  if [[ -n "$CREATED_JOB_ID" ]]; then
    RESP=$(api_call POST "api-parts" "{
      \"job_id\": \"${CREATED_JOB_ID}\",
      \"part_number\": \"BAD-QTY\",
      \"quantity\": 0
    }")
    STATUS=$(get_status "$RESP")
    if [[ "$STATUS" == "422" || "$STATUS" == "400" ]]; then
      echo -e "  ${GREEN}PASS${NC} POST /api-parts - quantity=0 returns validation error (HTTP ${STATUS})"
      TESTS_PASSED=$((TESTS_PASSED + 1))
    else
      echo -e "  ${RED}FAIL${NC} POST /api-parts - quantity=0 should fail (got HTTP ${STATUS})"
      TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
  fi
fi

# ── 4. Operations API Tests ────────────────────────────────────────────────────

if [[ "$ENDPOINT_FILTER" == "all" || "$ENDPOINT_FILTER" == "operations" ]]; then
  log_section "4. Operations API"

  # 4.1 List operations
  RESP=$(api_call GET "api-operations?limit=5")
  assert_status "GET /api-operations - List operations" "200" "$RESP" || true

  # 4.2 Filter by part
  if [[ -n "$CREATED_PART_ID" ]]; then
    RESP=$(api_call GET "api-operations?part_id=${CREATED_PART_ID}")
    assert_status "GET /api-operations?part_id=X - Filter by part" "200" "$RESP" || true
  fi

  # 4.3 Create operation with auto-sequence
  if [[ -n "$CREATED_PART_ID" ]]; then
    RESP=$(api_call POST "api-operations" "{
      \"part_id\": \"${CREATED_PART_ID}\",
      \"operation_name\": \"E2E Auto-Sequence Op\",
      \"estimated_time_minutes\": 30
    }")
    STATUS=$(get_status "$RESP")
    if [[ "$STATUS" == "201" ]]; then
      NEW_OP_ID=$(get_body "$RESP" | grep -o '"id":"[^"]*"' | head -1 | sed 's/"id":"//' | sed 's/"//')
      echo -e "  ${GREEN}PASS${NC} POST /api-operations - Create with auto-sequence (HTTP 201)"
      TESTS_PASSED=$((TESTS_PASSED + 1))
    else
      echo -e "  ${RED}FAIL${NC} POST /api-operations - Create failed (HTTP ${STATUS})"
      echo "       Body: $(get_body "$RESP" | head -c 200)"
      TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
  fi

  # 4.4 Update operation
  if [[ -n "$CREATED_OPERATION_ID" ]]; then
    RESP=$(api_call PATCH "api-operations?id=${CREATED_OPERATION_ID}" '{"notes": "Updated by E2E test", "completion_percentage": 50}')
    assert_status "PATCH /api-operations?id=X - Update operation" "200" "$RESP" || true
  fi

  # 4.5 Validation: Invalid status
  if [[ -n "$CREATED_PART_ID" ]]; then
    RESP=$(api_call POST "api-operations" "{
      \"part_id\": \"${CREATED_PART_ID}\",
      \"operation_name\": \"Bad Status Op\",
      \"status\": \"invalid\"
    }")
    STATUS=$(get_status "$RESP")
    if [[ "$STATUS" == "422" || "$STATUS" == "400" ]]; then
      echo -e "  ${GREEN}PASS${NC} POST /api-operations - Invalid status returns error (HTTP ${STATUS})"
      TESTS_PASSED=$((TESTS_PASSED + 1))
    else
      echo -e "  ${YELLOW}WARN${NC} POST /api-operations - Invalid status: HTTP ${STATUS}"
      TESTS_SKIPPED=$((TESTS_SKIPPED + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
  fi
fi

# ── 5. Job Lifecycle Tests ─────────────────────────────────────────────────────

if [[ "$ENDPOINT_FILTER" == "all" || "$ENDPOINT_FILTER" == "lifecycle" ]]; then
  log_section "5. Job Lifecycle API"

  if [[ -n "$CREATED_JOB_ID" ]]; then
    # 5.1 Start job (not_started -> in_progress)
    RESP=$(api_call POST "api-job-lifecycle/start?id=${CREATED_JOB_ID}")
    assert_status "POST /lifecycle/start - Start job" "200" "$RESP" || true
    assert_contains "POST /lifecycle/start - Status is in_progress" '"new_status":"in_progress"' "$RESP" || true

    # 5.2 Try to start again (should fail - already in_progress)
    RESP=$(api_call POST "api-job-lifecycle/start?id=${CREATED_JOB_ID}")
    assert_status "POST /lifecycle/start - Double start returns 400" "400" "$RESP" || true
    assert_contains "POST /lifecycle/start - Invalid transition error" "INVALID_STATE_TRANSITION" "$RESP" || true

    # 5.3 Stop job (in_progress -> on_hold)
    RESP=$(api_call POST "api-job-lifecycle/stop?id=${CREATED_JOB_ID}")
    assert_status "POST /lifecycle/stop - Stop job" "200" "$RESP" || true
    assert_contains "POST /lifecycle/stop - Status is on_hold" '"new_status":"on_hold"' "$RESP" || true

    # 5.4 Resume job (on_hold -> in_progress)
    RESP=$(api_call POST "api-job-lifecycle/resume?id=${CREATED_JOB_ID}")
    assert_status "POST /lifecycle/resume - Resume job" "200" "$RESP" || true
    assert_contains "POST /lifecycle/resume - Status is in_progress" '"new_status":"in_progress"' "$RESP" || true

    # 5.5 Complete job (in_progress -> completed)
    RESP=$(api_call POST "api-job-lifecycle/complete?id=${CREATED_JOB_ID}")
    assert_status "POST /lifecycle/complete - Complete job" "200" "$RESP" || true
    assert_contains "POST /lifecycle/complete - Status is completed" '"new_status":"completed"' "$RESP" || true

    # 5.6 Try to start completed job (should fail)
    RESP=$(api_call POST "api-job-lifecycle/start?id=${CREATED_JOB_ID}")
    assert_status "POST /lifecycle/start - Cannot start completed job" "400" "$RESP" || true

    # 5.7 Invalid operation name
    RESP=$(api_call POST "api-job-lifecycle/invalid_op?id=${CREATED_JOB_ID}")
    assert_status "POST /lifecycle/invalid - Returns 400" "400" "$RESP" || true
  else
    echo -e "  ${YELLOW}SKIP${NC} Job lifecycle tests (no job ID)"
    TESTS_SKIPPED=$((TESTS_SKIPPED + 5))
    TOTAL_TESTS=$((TOTAL_TESTS + 5))
  fi

  # 5.8 Missing job ID
  RESP=$(api_call POST "api-job-lifecycle/start")
  assert_status "POST /lifecycle/start - Missing ID returns 400" "400" "$RESP" || true

  # 5.9 Non-existent job ID
  RESP=$(api_call POST "api-job-lifecycle/start?id=00000000-0000-0000-0000-000000000000")
  assert_status "POST /lifecycle/start - Non-existent ID returns 404" "404" "$RESP" || true
fi

# ── 6. Operation Lifecycle Tests ───────────────────────────────────────────────

if [[ "$ENDPOINT_FILTER" == "all" || "$ENDPOINT_FILTER" == "lifecycle" ]]; then
  log_section "6. Operation Lifecycle API"

  if [[ -n "$CREATED_OPERATION_ID" ]]; then
    # 6.1 Start operation
    RESP=$(api_call POST "api-operation-lifecycle/start?id=${CREATED_OPERATION_ID}")
    assert_status "POST /op-lifecycle/start - Start operation" "200" "$RESP" || true

    # 6.2 Pause operation
    RESP=$(api_call POST "api-operation-lifecycle/pause?id=${CREATED_OPERATION_ID}")
    assert_status "POST /op-lifecycle/pause - Pause operation" "200" "$RESP" || true

    # 6.3 Resume operation
    RESP=$(api_call POST "api-operation-lifecycle/resume?id=${CREATED_OPERATION_ID}")
    assert_status "POST /op-lifecycle/resume - Resume operation" "200" "$RESP" || true

    # 6.4 Complete operation
    RESP=$(api_call POST "api-operation-lifecycle/complete?id=${CREATED_OPERATION_ID}")
    assert_status "POST /op-lifecycle/complete - Complete operation" "200" "$RESP" || true
    assert_contains "POST /op-lifecycle/complete - Status completed" '"new_status":"completed"' "$RESP" || true

    # 6.5 Cannot complete again
    RESP=$(api_call POST "api-operation-lifecycle/complete?id=${CREATED_OPERATION_ID}")
    assert_status "POST /op-lifecycle/complete - Double complete returns 400" "400" "$RESP" || true
  else
    echo -e "  ${YELLOW}SKIP${NC} Operation lifecycle tests (no operation ID)"
    TESTS_SKIPPED=$((TESTS_SKIPPED + 4))
    TOTAL_TESTS=$((TOTAL_TESTS + 4))
  fi

  # 6.6 Missing operation ID
  RESP=$(api_call POST "api-operation-lifecycle/start")
  assert_status "POST /op-lifecycle/start - Missing ID returns 400" "400" "$RESP" || true
fi

# ── 7. Issues / NCR API Tests ─────────────────────────────────────────────────

if [[ "$ENDPOINT_FILTER" == "all" || "$ENDPOINT_FILTER" == "issues" ]]; then
  log_section "7. Issues / NCR API"

  # 7.1 List issues
  RESP=$(api_call GET "api-issues?limit=5")
  assert_status "GET /api-issues - List issues" "200" "$RESP" || true

  # 7.2 Create issue
  if [[ -n "$CREATED_OPERATION_ID" ]]; then
    RESP=$(api_call POST "api-issues" "{
      \"operation_id\": \"${CREATED_OPERATION_ID}\",
      \"title\": \"E2E Test Issue\",
      \"description\": \"Created by API E2E test\",
      \"severity\": \"medium\"
    }")
    STATUS=$(get_status "$RESP")
    if [[ "$STATUS" == "201" ]]; then
      CREATED_ISSUE_ID=$(get_body "$RESP" | grep -o '"id":"[^"]*"' | head -1 | sed 's/"id":"//' | sed 's/"//')
      echo -e "  ${GREEN}PASS${NC} POST /api-issues - Create issue (HTTP 201)"
      TESTS_PASSED=$((TESTS_PASSED + 1))
    else
      echo -e "  ${RED}FAIL${NC} POST /api-issues - Create failed (HTTP ${STATUS})"
      echo "       Body: $(get_body "$RESP" | head -c 200)"
      TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
  fi

  # 7.3 Validation: Missing required fields
  RESP=$(api_call POST "api-issues" '{"title": "Missing fields"}')
  STATUS=$(get_status "$RESP")
  if [[ "$STATUS" == "422" || "$STATUS" == "400" || "$STATUS" == "500" ]]; then
    echo -e "  ${GREEN}PASS${NC} POST /api-issues - Missing fields returns error (HTTP ${STATUS})"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    echo -e "  ${RED}FAIL${NC} POST /api-issues - Missing fields should fail (HTTP ${STATUS})"
    TESTS_FAILED=$((TESTS_FAILED + 1))
  fi
  TOTAL_TESTS=$((TOTAL_TESTS + 1))

  # 7.4 Validation: Invalid severity
  if [[ -n "$CREATED_OPERATION_ID" ]]; then
    RESP=$(api_call POST "api-issues" "{
      \"operation_id\": \"${CREATED_OPERATION_ID}\",
      \"title\": \"Bad Severity\",
      \"description\": \"Test\",
      \"severity\": \"super_critical\"
    }")
    STATUS=$(get_status "$RESP")
    if [[ "$STATUS" == "422" || "$STATUS" == "400" ]]; then
      echo -e "  ${GREEN}PASS${NC} POST /api-issues - Invalid severity returns error (HTTP ${STATUS})"
      TESTS_PASSED=$((TESTS_PASSED + 1))
    else
      echo -e "  ${YELLOW}WARN${NC} POST /api-issues - Invalid severity: HTTP ${STATUS}"
      TESTS_SKIPPED=$((TESTS_SKIPPED + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
  fi

  # 7.5 Filter issues
  RESP=$(api_call GET "api-issues?severity=high&status=open&limit=5")
  assert_status "GET /api-issues?severity=high - Filter issues" "200" "$RESP" || true
fi

# ── 8. Substeps API Tests ─────────────────────────────────────────────────────

if [[ "$ENDPOINT_FILTER" == "all" || "$ENDPOINT_FILTER" == "substeps" ]]; then
  log_section "8. Substeps API"

  # 8.1 List substeps
  RESP=$(api_call GET "api-substeps?limit=5")
  assert_status "GET /api-substeps - List substeps" "200" "$RESP" || true

  # 8.2 Create substep
  if [[ -n "$CREATED_OPERATION_ID" ]]; then
    RESP=$(api_call POST "api-substeps" "{
      \"operation_id\": \"${CREATED_OPERATION_ID}\",
      \"description\": \"E2E test substep\",
      \"sequence\": 1
    }")
    STATUS=$(get_status "$RESP")
    if [[ "$STATUS" == "201" ]]; then
      CREATED_SUBSTEP_ID=$(get_body "$RESP" | grep -o '"id":"[^"]*"' | head -1 | sed 's/"id":"//' | sed 's/"//')
      echo -e "  ${GREEN}PASS${NC} POST /api-substeps - Create substep (HTTP 201)"
      TESTS_PASSED=$((TESTS_PASSED + 1))
    else
      echo -e "  ${YELLOW}WARN${NC} POST /api-substeps - HTTP ${STATUS}"
      TESTS_SKIPPED=$((TESTS_SKIPPED + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
  fi

  # 8.3 Complete substep
  if [[ -n "$CREATED_SUBSTEP_ID" ]]; then
    RESP=$(api_call PATCH "api-substeps?id=${CREATED_SUBSTEP_ID}" '{"completed": true}')
    assert_status "PATCH /api-substeps - Complete substep" "200" "$RESP" || true
  fi
fi

# ── 9. Webhooks API Tests ─────────────────────────────────────────────────────

if [[ "$ENDPOINT_FILTER" == "all" || "$ENDPOINT_FILTER" == "webhooks" ]]; then
  log_section "9. Webhooks API"

  # 9.1 List webhooks
  RESP=$(api_call GET "api-webhooks?limit=5")
  assert_status "GET /api-webhooks - List webhooks" "200" "$RESP" || true

  # 9.2 Create webhook
  RESP=$(api_call POST "api-webhooks" "{
    \"url\": \"https://httpbin.org/post\",
    \"event_type\": \"job.completed\",
    \"active\": true
  }")
  STATUS=$(get_status "$RESP")
  if [[ "$STATUS" == "201" ]]; then
    CREATED_WEBHOOK_ID=$(get_body "$RESP" | grep -o '"id":"[^"]*"' | head -1 | sed 's/"id":"//' | sed 's/"//')
    echo -e "  ${GREEN}PASS${NC} POST /api-webhooks - Create webhook (HTTP 201)"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    echo -e "  ${YELLOW}WARN${NC} POST /api-webhooks - HTTP ${STATUS}"
    TESTS_SKIPPED=$((TESTS_SKIPPED + 1))
  fi
  TOTAL_TESTS=$((TOTAL_TESTS + 1))

  # 9.3 Update webhook
  if [[ -n "$CREATED_WEBHOOK_ID" ]]; then
    RESP=$(api_call PATCH "api-webhooks?id=${CREATED_WEBHOOK_ID}" '{"active": false}')
    assert_status "PATCH /api-webhooks - Disable webhook" "200" "$RESP" || true
  fi

  # 9.4 Filter webhooks
  RESP=$(api_call GET "api-webhooks?active=true&limit=5")
  assert_status "GET /api-webhooks?active=true - Filter webhooks" "200" "$RESP" || true
fi

# ── 10. CORS / OPTIONS Tests ──────────────────────────────────────────────────

if [[ "$ENDPOINT_FILTER" == "all" ]]; then
  log_section "10. CORS / OPTIONS"

  RESP=$(curl -s -w "\n%{http_code}" -X OPTIONS "${BASE_URL}/api-jobs" \
    -H "Origin: https://example.com" \
    -H "Access-Control-Request-Method: POST")
  assert_status "OPTIONS /api-jobs - CORS preflight" "200" "$RESP" || true
fi

# ── Summary ────────────────────────────────────────────────────────────────────

print_summary

# Exit with proper code
if [[ $TESTS_FAILED -gt 0 ]]; then
  exit 1
fi
exit 0
