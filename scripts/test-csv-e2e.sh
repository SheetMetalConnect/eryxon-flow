#!/usr/bin/env bash
#
# Eryxon Flow - CSV Import E2E Test
# Tests bulk-sync pipeline: cells → jobs → parts → operations
#

set -eo pipefail

SUPABASE_URL="${SUPABASE_URL:?Set SUPABASE_URL}"
API_KEY="${API_KEY:?Set API_KEY}"
BASE="${SUPABASE_URL}/functions/v1"
AUTH="Authorization: Bearer ${API_KEY}"
CT="Content-Type: application/json"

RED='\033[0;31m' GREEN='\033[0;32m' YELLOW='\033[0;33m' CYAN='\033[0;36m' NC='\033[0m' BOLD='\033[1m'
P=0 F=0 T=0

call() { curl -s -w "\n%{http_code}" -X "$1" -H "$AUTH" -H "$CT" ${3:+-d "$3"} "${BASE}/$2"; }
status() { echo "$1" | tail -1; }
body() { echo "$1" | sed '$d'; }
jp() { echo "$1" | python3 -c "import sys,json; d=json.load(sys.stdin); $2" 2>/dev/null || echo ""; }

ok() {
  T=$((T+1))
  if [[ "$2" == "$3" ]]; then echo -e "  ${GREEN}✓${NC} $1"; P=$((P+1))
  else echo -e "  ${RED}✗${NC} $1 — got '$3' (expected '$2')"; F=$((F+1)); fi
}

TS=$(date +%s)
echo -e "${BOLD}${CYAN}\n  CSV E2E — jobs → parts → operations\n${NC}"

# ── 1. Resolve cells ──────────────────────────────────────────────────────────
echo -e "${CYAN}── 1. Resolve cell IDs ──${NC}"
R=$(call GET "api-cells")
B=$(body "$R")
ok "List cells HTTP" "200" "$(status "$R")"

CELL_LAS=$(jp "$B" "print([c['id'] for c in d['data']['cells'] if 'aser' in c['name']][0])")
CELL_KNT=$(jp "$B" "print([c['id'] for c in d['data']['cells'] if 'antbank' in c['name']][0])")
CELL_WLD=$(jp "$B" "print([c['id'] for c in d['data']['cells'] if 'assen' in c['name']][0])")
CELL_FIN=$(jp "$B" "print([c['id'] for c in d['data']['cells'] if 'fwerking' in c['name']][0])")

CELL_CT=0
[[ -n "$CELL_LAS" ]] && CELL_CT=$((CELL_CT+1))
[[ -n "$CELL_KNT" ]] && CELL_CT=$((CELL_CT+1))
[[ -n "$CELL_WLD" ]] && CELL_CT=$((CELL_CT+1))
[[ -n "$CELL_FIN" ]] && CELL_CT=$((CELL_CT+1))
ok "Found 4 cells" "4" "$CELL_CT"
echo -e "  ${YELLOW}LAS=${CELL_LAS:0:8} KNT=${CELL_KNT:0:8} WLD=${CELL_WLD:0:8} FIN=${CELL_FIN:0:8}${NC}"

# ── 2. Sync jobs ──────────────────────────────────────────────────────────────
echo -e "\n${CYAN}── 2. Bulk-sync 2 jobs ──${NC}"
R=$(call POST "api-jobs/bulk-sync" '{"items":[
  {"external_id":"E2E-JOB-A-'$TS'","external_source":"e2e","job_number":"WO-E2E-A-'$TS'","customer":"Testklant BV","due_date":"2026-05-15","status":"not_started"},
  {"external_id":"E2E-JOB-B-'$TS'","external_source":"e2e","job_number":"WO-E2E-B-'$TS'","customer":"Metaal NL","due_date":"2026-04-30","status":"not_started"}
]}')
ok "Jobs sync HTTP" "200" "$(status "$R")"
ok "Jobs sync success" "True" "$(jp "$(body "$R")" "print(d['success'])")"
echo -e "  ${YELLOW}$(jp "$(body "$R")" "r=d['data']['results']; print(f'created={r[\"created\"]} updated={r[\"updated\"]} failed={r[\"failed\"]}')")${NC}"

# Resolve job IDs
sleep 1
R=$(call GET "api-jobs?search=WO-E2E-")
B=$(body "$R")
JOB_A=$(jp "$B" "print([j['id'] for j in d['data']['jobs'] if 'E2E-A' in j['job_number']][0])")
JOB_B=$(jp "$B" "print([j['id'] for j in d['data']['jobs'] if 'E2E-B' in j['job_number']][0])")
ok "Resolved job A" "true" "$([[ -n "$JOB_A" ]] && echo true || echo false)"
ok "Resolved job B" "true" "$([[ -n "$JOB_B" ]] && echo true || echo false)"
echo -e "  ${YELLOW}A=${JOB_A:0:8} B=${JOB_B:0:8}${NC}"

# ── 3. Sync parts ─────────────────────────────────────────────────────────────
echo -e "\n${CYAN}── 3. Bulk-sync 3 parts ──${NC}"
R=$(call POST "api-parts/bulk-sync" '{"items":[
  {"external_id":"E2E-P1-'$TS'","external_source":"e2e","part_number":"PLAAT-S235-E2E-'$TS'","job_id":"'$JOB_A'","material":"S235","quantity":4},
  {"external_id":"E2E-P2-'$TS'","external_source":"e2e","part_number":"RVS-304-E2E-'$TS'","job_id":"'$JOB_A'","material":"RVS 304","quantity":8},
  {"external_id":"E2E-P3-'$TS'","external_source":"e2e","part_number":"ALU-7075-E2E-'$TS'","job_id":"'$JOB_B'","material":"Aluminium 7075","quantity":16}
]}')
ok "Parts sync HTTP" "200" "$(status "$R")"
ok "Parts sync success" "True" "$(jp "$(body "$R")" "print(d['success'])")"
echo -e "  ${YELLOW}$(jp "$(body "$R")" "r=d['data']['results']; print(f'created={r[\"created\"]} updated={r[\"updated\"]} failed={r[\"failed\"]}')")${NC}"

# Resolve part IDs
sleep 1
R=$(call GET "api-parts?search=E2E-$TS")
B=$(body "$R")
PART_1=$(jp "$B" "print([p['id'] for p in d['data']['parts'] if 'PLAAT' in p['part_number']][0])")
PART_2=$(jp "$B" "print([p['id'] for p in d['data']['parts'] if 'RVS' in p['part_number']][0])")
PART_3=$(jp "$B" "print([p['id'] for p in d['data']['parts'] if 'ALU' in p['part_number']][0])")
ok "Resolved part 1" "true" "$([[ -n "$PART_1" ]] && echo true || echo false)"
ok "Resolved part 2" "true" "$([[ -n "$PART_2" ]] && echo true || echo false)"
ok "Resolved part 3" "true" "$([[ -n "$PART_3" ]] && echo true || echo false)"
echo -e "  ${YELLOW}P1=${PART_1:0:8} P2=${PART_2:0:8} P3=${PART_3:0:8}${NC}"

# ── 4. Sync operations ────────────────────────────────────────────────────────
echo -e "\n${CYAN}── 4. Bulk-sync 7 operations ──${NC}"
R=$(call POST "api-operations/bulk-sync" '{"items":[
  {"external_id":"E2E-OP1-'$TS'","external_source":"e2e","operation_name":"Lasersnijden","part_id":"'$PART_1'","cell_id":"'$CELL_LAS'","sequence":1,"estimated_time":120,"status":"not_started"},
  {"external_id":"E2E-OP2-'$TS'","external_source":"e2e","operation_name":"Kanten","part_id":"'$PART_1'","cell_id":"'$CELL_KNT'","sequence":2,"estimated_time":90,"status":"not_started"},
  {"external_id":"E2E-OP3-'$TS'","external_source":"e2e","operation_name":"Lassen","part_id":"'$PART_1'","cell_id":"'$CELL_WLD'","sequence":3,"estimated_time":180,"status":"not_started"},
  {"external_id":"E2E-OP4-'$TS'","external_source":"e2e","operation_name":"Afwerking","part_id":"'$PART_1'","cell_id":"'$CELL_FIN'","sequence":4,"estimated_time":45,"status":"not_started"},
  {"external_id":"E2E-OP5-'$TS'","external_source":"e2e","operation_name":"Lasersnijden","part_id":"'$PART_2'","cell_id":"'$CELL_LAS'","sequence":1,"estimated_time":60,"status":"not_started"},
  {"external_id":"E2E-OP6-'$TS'","external_source":"e2e","operation_name":"Kanten","part_id":"'$PART_2'","cell_id":"'$CELL_KNT'","sequence":2,"estimated_time":45,"status":"not_started"},
  {"external_id":"E2E-OP7-'$TS'","external_source":"e2e","operation_name":"Lasersnijden","part_id":"'$PART_3'","cell_id":"'$CELL_LAS'","sequence":1,"estimated_time":200,"status":"not_started"}
]}')
ok "Operations sync HTTP" "200" "$(status "$R")"
ok "Operations sync success" "True" "$(jp "$(body "$R")" "print(d['success'])")"
echo -e "  ${YELLOW}$(jp "$(body "$R")" "r=d['data']['results']; print(f'created={r[\"created\"]} updated={r[\"updated\"]} failed={r[\"failed\"]}')")${NC}"

# ── 5. Idempotency ────────────────────────────────────────────────────────────
echo -e "\n${CYAN}── 5. Idempotency (re-sync jobs) ──${NC}"
R=$(call POST "api-jobs/bulk-sync" '{"items":[
  {"external_id":"E2E-JOB-A-'$TS'","external_source":"e2e","job_number":"WO-E2E-A-'$TS'","customer":"Testklant BV Updated","due_date":"2026-05-15","status":"not_started"},
  {"external_id":"E2E-JOB-B-'$TS'","external_source":"e2e","job_number":"WO-E2E-B-'$TS'","customer":"Metaal NL Updated","due_date":"2026-04-30","status":"not_started"}
]}')
ok "Re-sync HTTP" "200" "$(status "$R")"
UPDATED=$(jp "$(body "$R")" "print(d['data']['results']['updated'])")
ok "Re-sync updated 2" "2" "$UPDATED"

# ── Summary ───────────────────────────────────────────────────────────────────
echo -e "\n${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  ${GREEN}Passed: $P${NC}  ${RED}Failed: $F${NC}  Total: $T"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
[[ $F -eq 0 ]]
