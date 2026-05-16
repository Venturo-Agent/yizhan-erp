#!/usr/bin/env bash
# nightly-audit.sh — QDF 半夜自動 audit + diff 報告
#
# 用法：
#   crontab -e 加：
#   7 3 * * * cd /Users/william/Projects/venturo-aierp && ./scripts/nightly-audit.sh >> /tmp/qdf-nightly.log 2>&1
#
# 產出：
#   Logan-Workspace/quality-debt/_audit-runs/{YYYY-MM-DD}.md（含全 audit 指標）
#   跟前一天 diff 寫進同檔尾段

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"

TODAY=$(date +%Y-%m-%d)
RUNS_DIR="Logan-Workspace/quality-debt/_audit-runs"
TODAY_FILE="$RUNS_DIR/$TODAY.md"
YESTERDAY=$(date -v-1d +%Y-%m-%d 2>/dev/null || date -d "yesterday" +%Y-%m-%d)
YESTERDAY_FILE="$RUNS_DIR/$YESTERDAY.md"

mkdir -p "$RUNS_DIR"

echo "═══ QDF Nightly Audit $TODAY ═══"
echo ""

# 跑全 audit、抓關鍵指標
CAP=$(npx tsx scripts/audit-capability-coverage.ts 2>&1 | grep -E "未守門：[0-9]+" | head -1 | grep -oE "[0-9]+" || echo "?")
FLOW=$(npx tsx scripts/audit-flow-strictness.ts 2>&1 | grep -E "必修 \(must\)：[0-9]+" | head -1 | grep -oE "[0-9]+$" || echo "?")
DATA=$(npx tsx scripts/audit-data-consistency.ts 2>&1 | grep -E "finding 數：[0-9]+" | head -1 | grep -oE "[0-9]+$" || echo "?")
SPEC=$(npx tsx scripts/audit-spec-coverage.ts 2>&1 | grep -E "覆蓋率：[0-9.]+%" | head -1 | grep -oE "[0-9.]+" || echo "?")
MIG_RECENT=$(npx tsx scripts/audit-migration-rollback-coverage.ts 2>&1 | grep -E "Recent 覆蓋率：[0-9.]+%" | head -1 | grep -oE "[0-9.]+" || echo "?")
UI_DIALOG=$(npx tsx scripts/audit-ui-consistency.ts 2>&1 | grep -E "SSOT 覆蓋率：[0-9.]+%" | head -1 | grep -oE "[0-9.]+" || echo "?")
TESTS=$(npx vitest run src/lib/hr/__tests__ src/lib/disbursement/__tests__ 2>&1 | grep -oE "[0-9]+ passed" | head -1 || echo "? passed")

# 寫今天的 snapshot
cat > "$TODAY_FILE" <<EOF
---
date: $TODAY
type: nightly audit run
generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)
---

# QDF Nightly Audit $TODAY

## 當日指標

| Metric | Value |
|--------|-------|
| audit:capability 未守 | $CAP |
| audit:flow 必修 | $FLOW |
| audit:data 散刻 | $DATA |
| audit:spec 覆蓋率 | $SPEC% |
| audit:migration recent 覆蓋率 | $MIG_RECENT% |
| audit:ui Dialog SSOT | $UI_DIALOG% |
| Unit tests | $TESTS |

EOF

# 跟前一天比 diff
if [ -f "$YESTERDAY_FILE" ]; then
  YEST_CAP=$(grep "capability 未守" "$YESTERDAY_FILE" | grep -oE "[0-9]+" | head -1 || echo "?")
  YEST_FLOW=$(grep "flow 必修" "$YESTERDAY_FILE" | grep -oE "[0-9]+" | head -1 || echo "?")
  YEST_DATA=$(grep "data 散刻" "$YESTERDAY_FILE" | grep -oE "[0-9]+" | head -1 || echo "?")
  YEST_SPEC=$(grep "spec 覆蓋率" "$YESTERDAY_FILE" | grep -oE "[0-9.]+" | head -1 || echo "?")

  cat >> "$TODAY_FILE" <<EOF

## 跟昨天 diff

| Metric | 昨天 | 今天 | △ |
|--------|------|------|---|
| capability 未守 | $YEST_CAP | $CAP | $([ "$YEST_CAP" = "$CAP" ] && echo "—" || echo "⚠ 變化") |
| flow 必修 | $YEST_FLOW | $FLOW | $([ "$YEST_FLOW" = "$FLOW" ] && echo "—" || echo "⚠ 變化") |
| data 散刻 | $YEST_DATA | $DATA | $([ "$YEST_DATA" = "$DATA" ] && echo "—" || echo "⚠ 變化") |
| spec 覆蓋 | $YEST_SPEC% | $SPEC% | $([ "$YEST_SPEC" = "$SPEC" ] && echo "—" || echo "⚠ 變化") |

EOF
else
  echo "  (沒有昨天 baseline、第一次跑)" >> "$TODAY_FILE"
fi

echo "✓ 寫入 $TODAY_FILE"

# 退步通報（簡單 heuristic：capability / flow / data 不可退步）
RETROGRADE=false
YEST_CAP="${YEST_CAP:-}"
YEST_FLOW="${YEST_FLOW:-}"
YEST_DATA="${YEST_DATA:-}"
if [ -n "$YEST_CAP" ] && [ "$CAP" != "?" ] && [ "$CAP" -gt "$YEST_CAP" ] 2>/dev/null; then RETROGRADE=true; fi
if [ -n "$YEST_FLOW" ] && [ "$FLOW" != "?" ] && [ "$FLOW" -gt "$YEST_FLOW" ] 2>/dev/null; then RETROGRADE=true; fi
if [ -n "$YEST_DATA" ] && [ "$DATA" != "?" ] && [ "$DATA" -gt "$YEST_DATA" ] 2>/dev/null; then RETROGRADE=true; fi

if $RETROGRADE; then
  echo "⚠ 退步偵測到！查 $TODAY_FILE"
  exit 1
else
  echo "✅ 無退步"
fi
