#!/bin/bash
# ============================================================
# ERP 整理憲法 守門 script
# 初版 2026-05-02、序號 2026-05-18 重整（原本 2 → 4 → 6 → 10 →… 跳號是因為早期條款廢除沒重排、現在 1→10 連號）
#
# 用法：
#   ./scripts/check-standards.sh          # 跑所有檢查
#   ./scripts/check-standards.sh --strict # CI 模式（任何違反 = exit 1）
#
# 目標：自動偵測能機械式偵測的違反、防止 ERP 退化
# 注：本檔只列「能機械偵測」的 10 條；CLAUDE.md 紅線 A/B/C/D/E/F/G 是「人為審查」紅線、不在此檔
# ============================================================

set -u

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

VIOLATIONS=0
STRICT="${1:-}"

# 顏色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

log_pass() { echo -e "${GREEN}✅ PASS${NC} $*"; }
log_fail() { echo -e "${RED}❌ FAIL${NC} $*"; VIOLATIONS=$((VIOLATIONS+1)); }
log_warn() { echo -e "${YELLOW}⚠️  WARN${NC} $*"; }

echo "============================================"
echo "ERP 整理憲法 守門檢查"
echo "============================================"

# ============================================================
# #1: isAdmin 後門式權限（散落）
# 紅線 #0 對應：系統內沒有「超級管理員」、所有訪問走 capability + features
# ============================================================
echo
echo "▶ #1: isAdmin 後門式權限"
ISADMIN_COUNT=$(grep -rn "useAuthStore.*isAdmin\|state\.isAdmin\b" src/ 2>/dev/null \
  | grep -v "isAdminRole\|//.*isAdmin\|persist.*isAdmin\|^\s*\*.*isAdmin\|useMyCapabilities\.ts" \
  | wc -l | tr -d ' ')
if [ "$ISADMIN_COUNT" -gt 0 ]; then
  log_fail "#1: 找到 $ISADMIN_COUNT 個 isAdmin flag 殘留、應改用 useMyCapabilities().has('<具體 capability>')"
  grep -rn "useAuthStore.*isAdmin\|state\.isAdmin\b" src/ 2>/dev/null \
    | grep -v "isAdminRole\|//.*isAdmin\|persist.*isAdmin" | head -3
else
  log_pass "#1: 無 isAdmin 散落"
fi

# ============================================================
# #2: hook 在 module level 用（i18n 半路爛）
# 譬喻：把翻譯字典放在「員工進門 list 外面」、員工還沒到字典還沒準備好、爛
# ============================================================
echo
echo "▶ #2: module-level useTranslations() / useXxx()"
# pattern: const t = useTranslations(...) 在 export const X = ... 上面（非 component 內）
MODULE_HOOK=$(grep -rn "^const t = useTranslations" src/ 2>/dev/null \
  | grep -v "//.*useTranslations" | wc -l | tr -d ' ')
if [ "$MODULE_HOOK" -gt 0 ]; then
  log_fail "#2: 找到 $MODULE_HOOK 個 module-level hook（應在 component 內）"
else
  log_pass "#2: 無 module-level hook"
fi

# ============================================================
# #3: 軟刪除欄位 SSOT（is_active 是唯一權威、不准 is_deleted / deleted_at 並存）
# 同一概念散刻在多個欄位 = 查詢條件爆炸、一處漏寫就漏資料
# 適用所有表（不只 HR）：客戶 / 訂單 / 供應商 / 任何 row 是否還有效、只看 is_active
# 例外（白名單）：terminated_at（員工離職日）/ closed_at（團封存）/ confirmed_at（單據確認）— 這些是「業務狀態時戳」、不是「軟刪除」
# ============================================================
echo
echo "▶ #3: 軟刪除欄位 SSOT"
DELETED_RESIDUE=$(grep -rn "is_deleted\|deleted_at" src/ 2>/dev/null \
  | sed 's|src//|src/|g' \
  | grep -v "database\.types\|supabase/types\.ts\|//\s*\(is_deleted\|deleted_at\)\|terminated_at\|closed_at\|confirmed_at" \
  | grep -v "src/lib/data/soft-delete\.ts\|src/lib/data/force-delete\.ts\|src/lib/data/filter-active\.ts\|src/lib/auth/enforce-workspace-scope\.ts" \
  | grep -v "src/data/core/createEntityHook\.ts\|src/data/core/types\.ts" \
  | grep -vE "^[^:]+:[0-9]+:\s*//.*deleted_at" \
  | grep -vE "^[^:]+:[0-9]+:\s*\*.*deleted_at" \
  | wc -l | tr -d ' ')
if [ "$DELETED_RESIDUE" -gt 0 ]; then
  log_fail "#3: is_deleted / deleted_at 殘留 $DELETED_RESIDUE 處（應統一用 is_active）"
  grep -rn "is_deleted\|deleted_at" src/ 2>/dev/null | grep -v "database\.types\|supabase/types\.ts" | head -3
else
  log_pass "#3: 軟刪除統一 is_active"
fi

# ============================================================
# #4: root 散文 .md / 自誇報告
# 根目錄只允許：README / CLAUDE / CHANGELOG / AGENTS / SKILLS
# ============================================================
echo
echo "▶ #4: root 多餘 .md"
ALLOWED_ROOT_MD=("README.md" "CLAUDE.md" "CHANGELOG.md" "AGENTS.md" "SKILLS.md")
EXTRA_MD=()
for f in *.md; do
  [ -f "$f" ] || continue
  found=0
  for allowed in "${ALLOWED_ROOT_MD[@]}"; do
    [ "$f" = "$allowed" ] && found=1 && break
  done
  [ $found -eq 0 ] && EXTRA_MD+=("$f")
done
if [ ${#EXTRA_MD[@]} -gt 0 ]; then
  log_fail "#4: root 多餘 .md: ${EXTRA_MD[*]}"
else
  log_pass "#4: root .md 乾淨（只有 README/CLAUDE/CHANGELOG/AGENTS/SKILLS）"
fi

# ============================================================
# #5: audit FK 指 auth.users 而非 employees(id)
# 紅線 B 對應：created_by / updated_by / performed_by 等指 employees(id)、不指 auth.users(id)
# ============================================================
echo
echo "▶ #5: audit FK 指 auth.users（應指 employees）"
AUDIT_FK_BAD=$(grep -rn "REFERENCES auth\.users.*created_by\|REFERENCES auth\.users.*updated_by\|REFERENCES auth\.users.*performed_by" \
  supabase/migrations/ 2>/dev/null | wc -l | tr -d ' ')
if [ "$AUDIT_FK_BAD" -gt 0 ]; then
  log_fail "#5: $AUDIT_FK_BAD 個 audit FK 指 auth.users（應改 employees(id)）"
else
  log_pass "#5: audit FK 都指 employees"
fi

# ============================================================
# #6: migration 命名（YYYYMMDDHHMMSS_*.sql）
# 確保 migration 依時間戳排序、避免 ordering 衝突
# ============================================================
echo
echo "▶ #6: migration timestamp 命名"
BAD_MIGRATION=$(find supabase/migrations -maxdepth 1 -name "*.sql" \
  | grep -v "/_archive/\|\.skip$" \
  | sed 's|.*/||' \
  | grep -vE "^[0-9]{14}_[a-z0-9_-]+\.sql$" \
  | wc -l | tr -d ' ')
if [ "$BAD_MIGRATION" -gt 0 ]; then
  log_fail "#6: $BAD_MIGRATION 個 migration 命名不對（應 YYYYMMDDHHMMSS_name.sql）"
  find supabase/migrations -maxdepth 1 -name "*.sql" | grep -v "/_archive/\|\.skip$" | sed 's|.*/||' | grep -vE "^[0-9]{14}_[a-z0-9_-]+\.sql$" | head -3
else
  log_pass "#6: 所有 migration 命名合規"
fi

# ============================================================
# #7: 同類資源存兩份（database.types / user FK 欄位 等）
# ============================================================
echo
echo "▶ #7: 同類資源存兩份"
DUPS=0
# 兩份 database.types
if [ -f src/types/database.types.ts ] && [ -f src/lib/supabase/types.ts ]; then
  log_fail "#7a: 兩份 database.types（src/types/database.types.ts vs src/lib/supabase/types.ts）"
  DUPS=$((DUPS+1))
fi
# 兩個 user FK column 並存（grep 簡易檢查）
if grep -q "supabase_user_id" src/lib/supabase/types.ts 2>/dev/null \
   && grep -q '"user_id"' src/lib/supabase/types.ts 2>/dev/null; then
  if grep -A20 '"employees"' src/lib/supabase/types.ts 2>/dev/null | head -50 | grep -q "supabase_user_id"; then
    log_warn "#7b: employees 仍有 supabase_user_id 欄位（F3 收斂中）"
  fi
fi
[ $DUPS -eq 0 ] && log_pass "#7: 無同類資源存兩份"

# ============================================================
# #8: codebase 跟 RLS 用不同欄位（命名分裂）
# F3 收斂目標：src 完全不再用 supabase_user_id、統一 user_id
# ============================================================
echo
echo "▶ #8: codebase / RLS 命名分裂"
SUPABASE_USER_ID_COUNT=$(grep -rn "supabase_user_id" src/ 2>/dev/null \
  | grep -v "database\.types\|supabase/types\.ts\|//.*supabase_user_id\|@deprecated" \
  | wc -l | tr -d ' ')
if [ "$SUPABASE_USER_ID_COUNT" -gt 0 ]; then
  log_warn "#8: src 還有 $SUPABASE_USER_ID_COUNT 處用 supabase_user_id（F3 在收斂中、目標 0）"
else
  log_pass "#8: src 沒 supabase_user_id 殘留"
fi

# ============================================================
# #9: console.log / console.error 散落（應走 logger）
# ============================================================
echo
echo "▶ #9: console.* 散落"
CONSOLE_COUNT=$(grep -rn --include="*.ts" --include="*.tsx" "console\.\(log\|error\|warn\)" src/ 2>/dev/null \
  | grep -v "//.*console\|@deprecated\|database\.types\|supabase/types\|src/lib/utils/logger\.ts\|src/components/ErrorLogger\.tsx\|src/lib/error-tracking\.ts" \
  | wc -l | tr -d ' ')
if [ "$CONSOLE_COUNT" -gt 0 ]; then
  log_fail "#9: $CONSOLE_COUNT 處 console.* 應改用 logger"
  grep -rn --include="*.ts" --include="*.tsx" "console\.\(log\|error\|warn\)" src/ 2>/dev/null \
    | grep -v "//.*console\|@deprecated\|database\.types\|supabase/types\|src/lib/utils/logger\.ts\|src/components/ErrorLogger\.tsx\|src/lib/error-tracking\.ts" | head -3
else
  log_pass "#9: 無 console.* 散落"
fi

# ============================================================
# #10: any / as any 散落（蓋掉 TypeScript 抓錯能力）
# ============================================================
echo
echo "▶ #10: any / as any 散落"
# 用 awk 追蹤上一行是否有 eslint-disable-next-line、檔頭是否有 file-level eslint-disable
ANY_REPORT=$(find src -type f \( -name "*.ts" -o -name "*.tsx" \) \
  ! -path "*/database.types*" ! -path "*/supabase/types.ts" -print0 \
  | xargs -0 awk '
    BEGIN { violations = 0 }
    FNR == 1 { file_disable = 0; prev = "" }
    /\/\* eslint-disable @typescript-eslint\/no-explicit-any \*\// { file_disable = 1 }
    {
      if (!file_disable) {
        line = $0
        # 跳過 // 開頭或 * 開頭的 comment 行
        if (line ~ /^[[:space:]]*\/\// || line ~ /^[[:space:]]*\*/) { prev = line; next }
        # 同行 eslint-disable
        if (line ~ /eslint-disable.*no-explicit-any/) { prev = line; next }
        # 上一行 eslint-disable-next-line
        if (prev ~ /eslint-disable-next-line.*no-explicit-any/) { prev = line; next }
        if (line ~ /: any[^a-zA-Z_]/ || line ~ /as any[^a-zA-Z_]/ || line ~ /<any>/) {
          print FILENAME ":" FNR ": " line
          violations++
        }
      }
      prev = $0
    }
    END { print "TOTAL:" violations }
  ')
ANY_COUNT=$(echo "$ANY_REPORT" | grep "^TOTAL:" | sed 's/TOTAL://')
ANY_COUNT=${ANY_COUNT:-0}
if [ "$ANY_COUNT" -gt 0 ]; then
  log_fail "#10: $ANY_COUNT 處 any / as any / <any>（應改 unknown 或明確 type）"
  echo "$ANY_REPORT" | grep -v "^TOTAL:" | head -3
else
  log_pass "#10: 無 any / as any 散落"
fi

# ============================================================
# 額外：TypeScript 0 errors
# ============================================================
echo
echo "▶ 額外：TypeScript type-check"
TSC_ERRORS=$(npx tsc --noEmit 2>&1 | grep -c "error TS")
TSC_ERRORS=${TSC_ERRORS:-0}
if [ "$TSC_ERRORS" -gt 0 ]; then
  log_fail "TS check 有 $TSC_ERRORS 個錯誤"
else
  log_pass "TS check 0 errors"
fi

# ============================================================
# 結算
# ============================================================
echo
echo "============================================"
if [ $VIOLATIONS -eq 0 ]; then
  echo -e "${GREEN}✅ 所有守門檢查通過${NC}"
  exit 0
else
  echo -e "${RED}❌ $VIOLATIONS 條憲法違反${NC}"
  if [ "$STRICT" = "--strict" ]; then
    exit 1
  fi
  exit 0
fi
