#!/usr/bin/env bash
# =============================================================================
# verify-post-migration.sh — D+1 (2026-05-11) 驗證 schema migration 是否上去
#
# 用途：
#   D-Day (2026-05-10) 搬完伺服器、apply 三條 pending migration 後、隔天跑這支
#   - 001_soft_delete_columns.sql        → 14 張 table 加 deleted_at + partial index
#   - 002_audit_logs_table.sql           → audit_logs + 10 trigger + RLS
#   - 003_set_audit_context_function.sql → set_audit_context RPC + trigger 升級
#
#   再跑一次 baseline（type-check / lint / vitest / detector）確認應用層沒退步。
#
# 用法：
#   SUPABASE_PROJECT_REF=<新-ref> ./scripts/verify-post-migration.sh
#   SUPABASE_PROJECT_REF=<新-ref> SUPABASE_ACCESS_TOKEN=<token> ./scripts/verify-post-migration.sh
#   ./scripts/verify-post-migration.sh --skip-baseline    # 只驗 schema、不跑 baseline
#   ./scripts/verify-post-migration.sh --skip-demo        # 不跑 helper demo（不寫測試資料）
#
# 退出碼：
#   0 = 全綠
#   1 = 有失敗、看 stdout 哪步炸 + 該 apply 哪條 SQL
#
# Token / Ref 來源（依優先順位）：
#   1. env SUPABASE_ACCESS_TOKEN / SUPABASE_PROJECT_REF（D-Day 後新 ref 必走這裡）
#   2. fallback 到 scripts/pattern-detectors/check-all.mjs 的 hardcoded 值
#      （搬遷前的舊 project、僅供 dry-run）
# =============================================================================

set -uo pipefail

# 顏色
G='\033[0;32m'
R='\033[0;31m'
Y='\033[1;33m'
B='\033[0;34m'
N='\033[0m'

SKIP_BASELINE=false
SKIP_DEMO=false
for arg in "$@"; do
  case "$arg" in
    --skip-baseline) SKIP_BASELINE=true ;;
    --skip-demo)     SKIP_DEMO=true ;;
  esac
done

cd "$(dirname "$0")/.."
REPO_ROOT="$(pwd)"

# Token / Ref 必須從 env 帶（不再 hardcoded、避免 secret 進 repo）
SUPA_TOKEN="${SUPABASE_ACCESS_TOKEN:?need env SUPABASE_ACCESS_TOKEN}"
SUPA_REF="${SUPABASE_PROJECT_REF:?need env SUPABASE_PROJECT_REF}"

echo ""
echo -e "${B}🔧 Venturo Post-Migration 驗證${N}"
echo -e "${B}   $(date '+%Y-%m-%d %H:%M:%S')${N}"
echo -e "${B}   target ref: ${SUPA_REF}${N}"
echo ""

FAIL_COUNT=0
RESULTS=()

# ─────────────────────────────────────────────────────────────────────────────
# 工具：跑 SQL（走 Supabase Management API，跟 check-all.mjs 同源）
# ─────────────────────────────────────────────────────────────────────────────

# 接收 SQL（stdin）、輸出 JSON 結果到 stdout、HTTP 非 2xx 回 1
run_sql() {
  local sql
  sql=$(cat)
  # 用 jq 把 SQL 包進 JSON body（避免 quote escaping 地獄）
  local body
  body=$(jq -nc --arg q "$sql" '{query: $q}')

  local response
  local http_code
  response=$(curl -sS -w '\n___HTTP_CODE___%{http_code}' \
    -X POST "https://api.supabase.com/v1/projects/${SUPA_REF}/database/query" \
    -H "Authorization: Bearer ${SUPA_TOKEN}" \
    -H 'Content-Type: application/json' \
    -d "$body" 2>&1)
  http_code=$(echo "$response" | tail -n 1 | sed 's/___HTTP_CODE___//')
  body=$(echo "$response" | sed '$d')

  if [ "$http_code" != "200" ]; then
    echo "SQL_ERROR(http=$http_code): $body" >&2
    return 1
  fi
  echo "$body"
}

# 跑 SQL、回傳第一個 row 第一欄（或 null）
sql_scalar() {
  local result
  result=$(run_sql) || return 1
  echo "$result" | jq -r '.[0] | (to_entries | .[0].value) // "null"'
}

step() {
  local name="$1"
  shift
  echo -e "${B}▶ $name${N}"
  if "$@"; then
    echo -e "  ${G}✅ $name 過${N}"
    RESULTS+=("✅ $name")
  else
    echo -e "  ${R}❌ $name 失敗${N}"
    RESULTS+=("❌ $name")
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
  echo ""
}

# 失敗時印「該 apply 哪條 SQL」
hint_apply() {
  local file="$1"
  echo -e "  ${Y}↳ 修法：apply supabase/migrations-pending/${file}${N}"
}

# ─────────────────────────────────────────────────────────────────────────────
# 前置：確認 jq / curl 在
# ─────────────────────────────────────────────────────────────────────────────

if ! command -v jq >/dev/null 2>&1; then
  echo -e "${R}缺 jq、brew install jq${N}"
  exit 2
fi
if ! command -v curl >/dev/null 2>&1; then
  echo -e "${R}缺 curl${N}"
  exit 2
fi

# 連線健康檢查
echo -e "${B}▶ 連線測試（select 1）${N}"
if ! echo "SELECT 1 AS ok" | run_sql >/dev/null; then
  echo -e "  ${R}❌ Supabase Management API 不通、token / ref 對不上${N}"
  echo -e "  ${Y}↳ 確認 SUPABASE_ACCESS_TOKEN 還有效、SUPABASE_PROJECT_REF 是新 ref${N}"
  exit 2
fi
echo -e "  ${G}✅ 連線 OK${N}"
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# Section 1 — Schema 結構檢查
# ─────────────────────────────────────────────────────────────────────────────

# 14 張核心 table 全部要有 deleted_at（from 001）
SOFT_DELETE_TABLES=(
  orders tours customers payments payment_requests disbursement_orders
  receipts quotes attractions restaurants hotels suppliers
  tour_templates employees
)

check_soft_delete_columns() {
  local missing=()
  for t in "${SOFT_DELETE_TABLES[@]}"; do
    local exists
    exists=$(echo "
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='$t' AND column_name='deleted_at'
      )::text AS r
    " | sql_scalar) || return 1
    if [ "$exists" != "t" ] && [ "$exists" != "true" ]; then
      missing+=("$t")
    fi
  done
  if [ ${#missing[@]} -gt 0 ]; then
    echo "  缺 deleted_at column 的 table: ${missing[*]}"
    hint_apply "001_soft_delete_columns.sql"
    return 1
  fi
  echo "  14/14 張 table 都有 deleted_at"
  return 0
}

check_audit_logs_table() {
  local exists
  exists=$(echo "
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema='public' AND table_name='audit_logs'
    )::text AS r
  " | sql_scalar) || return 1
  if [ "$exists" != "t" ] && [ "$exists" != "true" ]; then
    echo "  audit_logs table 不存在"
    hint_apply "002_audit_logs_table.sql"
    return 1
  fi
  echo "  audit_logs table 存在"
  return 0
}

check_set_audit_context_fn() {
  local exists
  exists=$(echo "
    SELECT EXISTS (
      SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='public' AND p.proname='set_audit_context'
    )::text AS r
  " | sql_scalar) || return 1
  if [ "$exists" != "t" ] && [ "$exists" != "true" ]; then
    echo "  set_audit_context() function 不存在"
    hint_apply "003_set_audit_context_function.sql"
    return 1
  fi
  echo "  set_audit_context() function 存在"
  return 0
}

check_fn_record_audit_fn() {
  local exists
  exists=$(echo "
    SELECT EXISTS (
      SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='public' AND p.proname='fn_record_audit'
    )::text AS r
  " | sql_scalar) || return 1
  if [ "$exists" != "t" ] && [ "$exists" != "true" ]; then
    echo "  fn_record_audit() function 不存在"
    hint_apply "002_audit_logs_table.sql"
    return 1
  fi
  echo "  fn_record_audit() function 存在"
  return 0
}

# 10 張 audit trigger（from 002）
AUDIT_TRIGGER_TABLES=(
  orders payments payment_requests disbursement_orders receipts
  customers tours employees role_capabilities company_settings
)

check_audit_triggers() {
  local missing=()
  local have_table=()
  for t in "${AUDIT_TRIGGER_TABLES[@]}"; do
    # 注意：trigger function 命名是 audit_<table>、跟 002 SQL 對齊
    local trig_exists
    trig_exists=$(echo "
      SELECT EXISTS (
        SELECT 1 FROM information_schema.triggers
        WHERE trigger_schema='public'
          AND event_object_table='$t'
          AND trigger_name='audit_$t'
      )::text AS r
    " | sql_scalar) || return 1
    # Table 自己存不存在（避免「table 沒有所以 trigger 也沒有」誤判）
    local tbl_exists
    tbl_exists=$(echo "
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema='public' AND table_name='$t'
      )::text AS r
    " | sql_scalar) || return 1
    if [ "$tbl_exists" = "t" ] || [ "$tbl_exists" = "true" ]; then
      have_table+=("$t")
      if [ "$trig_exists" != "t" ] && [ "$trig_exists" != "true" ]; then
        missing+=("$t")
      fi
    fi
  done
  if [ ${#missing[@]} -gt 0 ]; then
    echo "  缺 audit_<name> trigger 的 table（${#missing[@]}/${#have_table[@]}）: ${missing[*]}"
    hint_apply "002_audit_logs_table.sql"
    return 1
  fi
  echo "  audit trigger 全掛（${#have_table[@]}/${#AUDIT_TRIGGER_TABLES[@]} 張 table、剩餘為 table 不存在）"
  return 0
}

step "1.1 deleted_at column（14 張 table）"      check_soft_delete_columns
step "1.2 audit_logs table 存在"                check_audit_logs_table
step "1.3 set_audit_context() function 存在"    check_set_audit_context_fn
step "1.4 fn_record_audit() function 存在"      check_fn_record_audit_fn
step "1.5 audit trigger 掛在核心 table（最多 10 張）" check_audit_triggers

# ─────────────────────────────────────────────────────────────────────────────
# Section 2 — Index 檢查
# ─────────────────────────────────────────────────────────────────────────────

check_partial_indexes() {
  # 預期 14 張 table 各一個 idx_<table>_active（從 001）
  local result
  result=$(echo "
    SELECT indexname FROM pg_indexes
    WHERE schemaname='public'
      AND indexname LIKE 'idx_%_active'
    ORDER BY indexname
  " | run_sql) || return 1

  local count
  count=$(echo "$result" | jq 'length')
  local got_names
  got_names=$(echo "$result" | jq -r '.[].indexname' | tr '\n' ',' | sed 's/,$//')

  local missing=()
  for t in "${SOFT_DELETE_TABLES[@]}"; do
    local expected="idx_${t}_active"
    if ! echo ",$got_names," | grep -q ",$expected,"; then
      # 看 table 自己存不存在
      local tbl_exists
      tbl_exists=$(echo "
        SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='$t')::text AS r
      " | sql_scalar) || return 1
      if [ "$tbl_exists" = "t" ] || [ "$tbl_exists" = "true" ]; then
        missing+=("$expected")
      fi
    fi
  done

  if [ ${#missing[@]} -gt 0 ]; then
    echo "  缺 partial index（${#missing[@]}）: ${missing[*]}"
    hint_apply "001_soft_delete_columns.sql"
    return 1
  fi
  echo "  partial index 共 ${count} 個、覆蓋全部存在的 table"
  return 0
}

check_audit_indexes() {
  local need=(idx_audit_workspace_time idx_audit_entity idx_audit_actor)
  local missing=()
  for idx in "${need[@]}"; do
    local exists
    exists=$(echo "
      SELECT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname='public' AND tablename='audit_logs' AND indexname='$idx'
      )::text AS r
    " | sql_scalar) || return 1
    if [ "$exists" != "t" ] && [ "$exists" != "true" ]; then
      missing+=("$idx")
    fi
  done
  if [ ${#missing[@]} -gt 0 ]; then
    echo "  缺 audit_logs index: ${missing[*]}"
    hint_apply "002_audit_logs_table.sql"
    return 1
  fi
  echo "  3/3 audit_logs index 存在"
  return 0
}

step "2.1 idx_<table>_active partial index" check_partial_indexes
step "2.2 audit_logs 三個查詢 index"          check_audit_indexes

# ─────────────────────────────────────────────────────────────────────────────
# Section 3 — RLS 檢查
# ─────────────────────────────────────────────────────────────────────────────

check_audit_logs_rls() {
  # 1. RLS enabled
  local rls_on
  rls_on=$(echo "
    SELECT c.relrowsecurity::text AS r
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname='audit_logs'
  " | sql_scalar) || return 1
  if [ "$rls_on" != "t" ] && [ "$rls_on" != "true" ]; then
    echo "  audit_logs RLS 沒開"
    hint_apply "002_audit_logs_table.sql"
    return 1
  fi

  # 2. policy 數量 >= 2（select + insert）
  local policy_count
  policy_count=$(echo "
    SELECT COUNT(*)::text AS r
    FROM pg_policies
    WHERE schemaname='public' AND tablename='audit_logs'
  " | sql_scalar) || return 1
  if [ "${policy_count:-0}" -lt 2 ]; then
    echo "  audit_logs policy 不足（有 ${policy_count} 條、預期 ≥ 2）"
    hint_apply "002_audit_logs_table.sql"
    return 1
  fi
  echo "  audit_logs RLS enabled、policy ${policy_count} 條"
  return 0
}

# 紅線 #1：workspaces 不准 FORCE RLS
check_workspaces_no_force() {
  local force
  force=$(echo "
    SELECT c.relforcerowsecurity::text AS r
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname='workspaces'
  " | sql_scalar) || return 1
  if [ "$force" = "t" ] || [ "$force" = "true" ]; then
    echo "  ❗ workspaces FORCE RLS 開了、紅線 #1 違反、登入會炸"
    echo "  ↳ 修法：ALTER TABLE public.workspaces NO FORCE ROW LEVEL SECURITY;"
    return 1
  fi
  echo "  workspaces NO FORCE RLS（紅線 #1 守住）"
  return 0
}

# 同步檢查：全 public 表都不能 FORCE RLS（跟 detector P004 同邏輯、提早 catch）
check_no_force_rls_anywhere() {
  local result
  result=$(echo "
    SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relforcerowsecurity=true
    ORDER BY c.relname
  " | run_sql) || return 1
  local count
  count=$(echo "$result" | jq 'length')
  if [ "${count:-0}" -gt 0 ]; then
    local names
    names=$(echo "$result" | jq -r '.[].relname' | tr '\n' ' ')
    echo "  ❗ 有 ${count} 張表 FORCE RLS: ${names}"
    return 1
  fi
  echo "  0 張 FORCE RLS 表"
  return 0
}

step "3.1 audit_logs 啟用 RLS + 有 policy" check_audit_logs_rls
step "3.2 workspaces 不能 FORCE RLS（紅線 #1）" check_workspaces_no_force
step "3.3 全 public schema 沒 FORCE RLS" check_no_force_rls_anywhere

# ─────────────────────────────────────────────────────────────────────────────
# Section 4 — Helper 接通驗證（demo：軟刪一筆假資料、看 audit_log 有沒有寫）
# ─────────────────────────────────────────────────────────────────────────────
#
# 設計：
#   - 不動真實資料
#   - 用一張可以隨便寫的 audit table（attractions）做 demo（同樣有 deleted_at）
#   - 步驟：
#     1. 找一個 employee 當 actor、找一個 workspace、找一筆 attraction（不動）
#     2. begin / set_audit_context / 軟刪除一筆 throwaway row（其實是先 INSERT 一筆 fake、再 UPDATE deleted_at）
#     3. 看 audit_logs 有沒有兩條（create + soft_delete）
#     4. ROLLBACK：把假資料清掉、避免污染
#   - 注意：Management API 一個 query 是一個 transaction、要單一 SQL 包起來
# ─────────────────────────────────────────────────────────────────────────────

check_helper_demo() {
  if [ "$SKIP_DEMO" = "true" ]; then
    echo "  --skip-demo 開了、不跑"
    return 0
  fi

  # 找一個 employee + workspace
  local actor
  actor=$(echo "SELECT id FROM public.employees LIMIT 1" | sql_scalar) || return 1
  if [ -z "$actor" ] || [ "$actor" = "null" ]; then
    echo "  沒 employee、跳過 demo（不算失敗）"
    return 0
  fi
  local ws
  ws=$(echo "SELECT workspace_id FROM public.employees WHERE id = '$actor'" | sql_scalar) || return 1
  if [ -z "$ws" ] || [ "$ws" = "null" ]; then
    echo "  employee 沒 workspace_id、跳過 demo"
    return 0
  fi

  # 跑 demo：用 attractions table（有 deleted_at + 有 audit trigger? attractions 不在 trigger 清單裡）
  # → 改用 orders（有 deleted_at + audit trigger）
  # 但 orders 有大量 NOT NULL constraint、INSERT fake 太麻煩、改用 employees？也不行（會污染人事）
  # → 折衷：直接寫一筆 audit_logs（測 RLS + structure）、不靠 trigger
  #
  # 真正的 trigger 接通驗證：跑一個無害 UPDATE — 找一筆 orders、把 updated_at 動一下、ROLLBACK
  # 但 Management API 每次 query 是獨立 statement、無法跨 statement ROLLBACK
  # → 用 DO $$ ... $$ 包 transaction 不可能（DO 沒有 transaction control）
  # → 改用 SAVEPOINT 不行、API 不支援
  #
  # 最安全做法：在單一 SQL 裡用 CTE / subquery 完成「測完即清」
  #   - 開 transaction（API 自動 wrap）
  #   - 寫一筆 audit_logs（手動、不靠 trigger）測 RLS / structure
  #   - 如果寫得進去 → audit_logs schema 對 + RLS service_role 通
  # Trigger 接通的真正測試 = 「軟刪除一筆 fake order、check audit_logs 多兩筆、再硬刪 fake order + audit_logs」
  # 這個太複雜、留給 William 手動跑（hint 出來）

  local before_count
  before_count=$(echo "SELECT COUNT(*)::text AS r FROM public.audit_logs" | sql_scalar) || return 1

  # 寫一筆 demo audit log（測 set_audit_context + insert）
  # 用 NULL entity_id（雖然 schema 是 NOT NULL、改用 random uuid）
  local probe_entity_id
  probe_entity_id=$(echo "SELECT gen_random_uuid()::text AS r" | sql_scalar) || return 1
  local demo_sql
  demo_sql=$(cat <<EOF
SELECT public.set_audit_context('${actor}'::uuid, 'verify-post-migration probe', NULL);
INSERT INTO public.audit_logs (workspace_id, actor_id, action, entity_type, entity_id, reason)
VALUES ('${ws}'::uuid, '${actor}'::uuid, 'probe', '__verify_post_migration__', '${probe_entity_id}'::uuid, 'D+1 probe');
SELECT id FROM public.audit_logs WHERE entity_type='__verify_post_migration__' AND entity_id='${probe_entity_id}'::uuid;
EOF
)
  local insert_result
  insert_result=$(echo "$demo_sql" | run_sql) || {
    echo "  ❌ 寫 audit_logs 失敗（schema 對不上 / RLS 擋 / set_audit_context 沒 function）"
    hint_apply "002 + 003"
    return 1
  }
  local probe_id
  probe_id=$(echo "$insert_result" | jq -r '.[0].id // "null"')
  if [ "$probe_id" = "null" ]; then
    echo "  ❌ 寫進去但 SELECT 不回（policy 怪）"
    return 1
  fi
  echo "  寫測試 audit log 成功（id=${probe_id}、entity_id=${probe_entity_id}）"

  # 清掉 probe（不污染）
  echo "DELETE FROM public.audit_logs WHERE entity_type='__verify_post_migration__' AND entity_id='${probe_entity_id}'::uuid" | run_sql >/dev/null || {
    echo -e "  ${Y}⚠ probe 清不掉、entity_id=${probe_entity_id}、手動跑：${N}"
    echo "    DELETE FROM public.audit_logs WHERE entity_id='${probe_entity_id}'::uuid;"
  }

  local after_count
  after_count=$(echo "SELECT COUNT(*)::text AS r FROM public.audit_logs" | sql_scalar) || return 1
  if [ "${before_count:-0}" != "${after_count:-0}" ]; then
    echo -e "  ${Y}⚠ probe 沒清乾淨、before=${before_count} after=${after_count}${N}"
  else
    echo "  probe 已清、audit_logs row 數還原"
  fi

  echo ""
  echo -e "  ${Y}↳ 真實 trigger 接通（軟刪除真資料、看 audit_logs 自動寫）需 William 手動驗證：${N}"
  echo -e "  ${Y}    SELECT public.set_audit_context('<emp-uuid>'::uuid, 'manual probe', NULL);${N}"
  echo -e "  ${Y}    UPDATE public.orders SET deleted_at = NOW() WHERE id = '<某筆-fake-order>'::uuid;${N}"
  echo -e "  ${Y}    SELECT * FROM public.audit_logs ORDER BY created_at DESC LIMIT 1;${N}"
  echo -e "  ${Y}    -- 預期：action='soft_delete'、actor_id 對、reason='manual probe'${N}"
  return 0
}

step "4.1 audit_logs 寫入接通（set_audit_context + INSERT + RLS）" check_helper_demo

# ─────────────────────────────────────────────────────────────────────────────
# Section 5 — Baseline 完整跑（type-check / lint / vitest / detector）
# ─────────────────────────────────────────────────────────────────────────────

if [ "$SKIP_BASELINE" = "true" ]; then
  echo -e "${Y}⚠ --skip-baseline 開了、不跑 verify:baseline${N}"
  echo ""
else
  step "5. npm run verify:baseline" \
    npm run verify:baseline
fi

# ─────────────────────────────────────────────────────────────────────────────
# 總結
# ─────────────────────────────────────────────────────────────────────────────

echo -e "${B}────────────────────────────────────────${N}"
echo -e "${B}📊 結果總結${N}"
echo ""
for r in "${RESULTS[@]}"; do
  echo "  $r"
done
echo ""

if [ "$FAIL_COUNT" -eq 0 ]; then
  echo -e "${G}✅ Post-migration 全綠（${#RESULTS[@]} 步）${N}"
  echo ""
  echo "下一步建議："
  echo "  1. 升級 enforceWorkspaceScope 加 deleted_at filter（refactor-backlog #15）"
  echo "  2. feature 層 query 全面改走 helper（拆遷 Phase 2）"
  echo "  3. 看 docs/post-migration-checklist.md"
  exit 0
else
  echo -e "${R}❌ ${FAIL_COUNT} 步失敗、看 stdout 訊息${N}"
  echo ""
  echo "常見排錯："
  echo "  - schema 沒 apply → 看每步 ↳ 提示的 .sql 檔、依序在 Supabase Dashboard / CLI apply"
  echo "  - SUPABASE_PROJECT_REF 還是舊 ref → export 新 ref 重跑"
  echo "  - SUPABASE_ACCESS_TOKEN 過期 → 去 dashboard 換新 token"
  exit 1
fi
