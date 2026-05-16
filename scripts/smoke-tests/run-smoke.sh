#!/usr/bin/env bash
# Endpoint smoke test - 用 smoke 帳號 cookie 打所有 GET endpoint
set -u

source /Users/william/.config/venturo/secrets.env
COOKIE_FILE="${COOKIE_FILE:-/tmp/smoke-cookies.txt}"
BASE="${BASE:-http://localhost:3000}"

if [ ! -s "$COOKIE_FILE" ]; then
  echo "no cookie at $COOKIE_FILE — refresh first"
  exit 1
fi
COOKIE=$(cat "$COOKIE_FILE")

PASS=0
FAIL=0
FAILED=()

probe() {
  local path="$1"
  local body
  local code
  body=$(curl -sS -o /tmp/last-body.json -w "%{http_code}" -H "Cookie: $COOKIE" "$BASE$path" 2>/tmp/last-stderr || echo "ERR")
  code=$body
  case "$code" in
    200|201|204)
      printf "  \033[32mOK \033[0m %s\n" "$path"
      PASS=$((PASS+1))
      ;;
    400|404)
      printf "  \033[33m%s\033[0m %s\n" "$code" "$path"
      ;;
    *)
      printf "  \033[31m%s\033[0m %s\n" "$code" "$path"
      FAIL=$((FAIL+1))
      FAILED+=("$code|$path")
      head -c 300 /tmp/last-body.json | sed 's/^/    | /'
      echo
      ;;
  esac
}

echo "=== smoke test against $BASE ==="

WS=b2222222-2222-2222-2222-222222222222
TOUR_NOW=22222222-2606-4001-8000-000000000001
TOUR_PAST=22222222-2603-4001-8000-000000000001
ORD_NOW=33333333-2606-4001-8000-000000000001
ROLE_ADMIN=7829922c-dcdf-4d31-871a-d8780b8cfc52
EMP_SMOKE=SMOKE01

GET_ENDPOINTS=(
  /api/health
  /api/health/db
  /api/health/detailed
  /api/auth/layout-context
  /api/bank-accounts
  /api/branches
  /api/contracts/list?tourId=$TOUR_NOW
  /api/contracts/members?tourId=$TOUR_NOW
  /api/departments
  /api/finance/accounting-subjects
  /api/finance/expense-categories?workspace_id=$WS
  /api/finance/payment-methods
  /api/finance/payment-methods?type=receipt
  /api/finance/payment-methods?type=payment
  /api/job-roles/selector-fields
  /api/line/conversations
  /api/line/setup/status
  /api/organization/branches
  /api/organization/brands
  /api/organization/departments
  /api/permissions/features
  /api/roles
  /api/roles/$ROLE_ADMIN/tab-permissions
  /api/settings/env
  /api/todo-columns
  /api/workspaces
  /api/workspaces/$WS
  /api/workspaces/$WS/ai-settings
  /api/workspaces/$WS/billing
  /api/employees/by-ref/$EMP_SMOKE
  /api/itineraries/by-tour/$TOUR_NOW
  /api/itineraries/by-tour/$TOUR_PAST
  /api/amadeus-totp/current
)

# POST-only / non-business endpoints to skip:
# /api/airports (POST)、/api/cis/analyze (POST)、auth/* (POST)、tasks/create (POST)
# /api/d/[code]、/api/contracts/[id]/pdf、/api/contracts/sign（公開分享連結）
# OCR, Vision, Bot, Cron, Storage, log-error 都 POST

for ep in "${GET_ENDPOINTS[@]}"; do probe "$ep"; done

echo
echo "=== summary: PASS=$PASS  FAIL=$FAIL ==="
if [ "$FAIL" -gt 0 ]; then
  echo "failed:"
  for f in "${FAILED[@]}"; do echo "  $f"; done
  exit 1
fi
