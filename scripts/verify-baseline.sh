#!/usr/bin/env bash
# =============================================================================
# verify-baseline.sh — D-Day 搬完一鍵驗證 baseline
#
# 用途：
#   搬完 Supabase 後跑一次、確認所有自動化都還綠
#   - type-check
#   - lint（看 warning 數對齊預期）
#   - vitest 全跑
#   - pattern detector
#   - （可選）e2e smoke
#
# 用法：
#   ./scripts/verify-baseline.sh           # 跑全部（不含 e2e）
#   ./scripts/verify-baseline.sh --e2e     # 含 e2e smoke
#
# 退出碼：0 = 綠燈、≥1 = 有壞、看 stdout 哪步炸
# =============================================================================

set -uo pipefail

# 顏色
G='\033[0;32m'  # green
R='\033[0;31m'  # red
Y='\033[1;33m'  # yellow
B='\033[0;34m'  # blue
N='\033[0m'     # reset

INCLUDE_E2E=false
for arg in "$@"; do
  case "$arg" in
    --e2e) INCLUDE_E2E=true ;;
  esac
done

cd "$(dirname "$0")/.."
REPO_ROOT="$(pwd)"

echo ""
echo -e "${B}🔧 Venturo ERP — Baseline 驗證${N}"
echo -e "${B}   $(date '+%Y-%m-%d %H:%M:%S')${N}"
echo ""

# 累計 fail 數
FAIL_COUNT=0
RESULTS=()

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

# ─────────────────────────────────────────────────────────────────────────────
# 1. type-check
# ─────────────────────────────────────────────────────────────────────────────
step "TypeScript type-check" \
  npm run type-check

# ─────────────────────────────────────────────────────────────────────────────
# 2. lint（不擋 warning、只擋 error）
# ─────────────────────────────────────────────────────────────────────────────
step "ESLint（error 必過、warning 看 pattern detector）" \
  npm run lint

# 順便看新 ESLint rule 的 warning 數量
echo -e "${B}▶ ESLint warning 統計（informational、不擋）${N}"
WARN_DIRECT_SUPABASE=$(npx eslint 'src/' 2>&1 | grep -c "no-direct-supabase-in-feature-layer" || echo 0)
WARN_SELECT_STAR=$(npx eslint 'src/' 2>&1 | grep -c "no-select-star" || echo 0)
echo "  - feature 層直連 supabase: ${WARN_DIRECT_SUPABASE} 處"
echo "  - .select('*'): ${WARN_SELECT_STAR} 處"
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# 3. vitest（必綠）
# ─────────────────────────────────────────────────────────────────────────────
step "Vitest unit/integration tests" \
  npx vitest run

# ─────────────────────────────────────────────────────────────────────────────
# 4. pattern detectors（informational、不擋 baseline）
# ─────────────────────────────────────────────────────────────────────────────
echo -e "${B}▶ Pattern detectors（informational）${N}"
node scripts/pattern-detectors/check-all.mjs P100 P101 P102 || true
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# 5. e2e smoke（可選）
# ─────────────────────────────────────────────────────────────────────────────
if [ "$INCLUDE_E2E" = true ]; then
  step "Playwright E2E smoke" \
    npm run test:e2e:smoke
else
  echo -e "${Y}⚠ 跳過 E2E smoke（--e2e 啟用）${N}"
  echo ""
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
  echo -e "${G}✅ Baseline 全綠（${#RESULTS[@]} 步）${N}"
  echo ""
  echo "下一步建議："
  echo "  1. 看 docs/D-DAY-SUMMARY.md 接著做"
  echo "  2. apply pending migrations:"
  echo "     - supabase/migrations-pending/001_soft_delete_columns.sql"
  echo "     - supabase/migrations-pending/002_audit_logs_table.sql"
  echo "     - supabase/migrations-pending/003_set_audit_context_function.sql"
  echo "  3. 升級 enforceWorkspaceScope 加 deleted_at filter"
  exit 0
else
  echo -e "${R}❌ ${FAIL_COUNT} 步失敗、看 stdout 訊息${N}"
  exit 1
fi
