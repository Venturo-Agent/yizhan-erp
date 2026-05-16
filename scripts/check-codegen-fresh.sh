#!/bin/sh
# check-codegen-fresh.sh — CI check「3 個 SSOT 檔有沒有跟 codegen 同步」
#
# 機制：跑一次 codegen、看有沒有 git diff、有 = 有人手改沒跑 codegen
# 用法（CI / local）：./scripts/check-codegen-fresh.sh
# Exit 0 = 同步 / Exit 1 = drift（CI 擋 PR）

set -e

cd "$(dirname "$0")/.."

# 跑 codegen（不 commit、只 overwrite）
npm run codegen:permissions > /dev/null 2>&1

# 看 3 個 SSOT 檔有沒有 git diff
DIFF=$(git diff --name-only -- \
  src/lib/permissions/features.ts \
  src/lib/permissions/module-tabs.ts \
  src/lib/permissions/capabilities.ts)

if [ -n "$DIFF" ]; then
  echo "❌ 3 個 SSOT 檔跟 src/modules/* 不同步："
  echo "$DIFF"
  echo ""
  echo "💡 修法："
  echo "   1. 跑 npm run codegen:permissions"
  echo "   2. git add 上面這 3 個檔"
  echo "   3. amend / 新 commit 後再 push"
  echo ""
  echo "（若有手改 features.ts / module-tabs.ts / capabilities.ts、需先回頭改 src/modules/<code>.ts、然後跑 codegen）"
  git diff -- "$DIFF" | head -50
  exit 1
fi

echo "✓ 3 個 SSOT 檔跟 src/modules/* 100% 同步"
exit 0
