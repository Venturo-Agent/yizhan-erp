#!/bin/bash

# 🔍 文件大小檢查腳本
# 確保所有文件符合大小限制

set -e

MAX_COMPONENT_LINES=300
MAX_HOOK_LINES=200
MAX_UTIL_LINES=150
MAX_TYPE_LINES=500

violations=0
total_files=0

echo "🔍 開始檢查文件大小..."
echo "================================"

# 檢查組件文件 (.tsx)
echo ""
echo "📦 檢查組件文件 (最大 $MAX_COMPONENT_LINES 行)..."
while IFS= read -r file; do
  total_files=$((total_files + 1))
  lines=$(wc -l < "$file" | tr -d ' ')

  if [ "$lines" -gt "$MAX_COMPONENT_LINES" ]; then
    echo "❌ $file"
    echo "   超過限制: $lines 行 (限制: $MAX_COMPONENT_LINES 行)"
    violations=$((violations + 1))
  fi
done < <(find src -name "*.tsx" -not -path "*/node_modules/*")

# 檢查 Hook 文件
echo ""
echo "🪝 檢查 Hook 文件 (最大 $MAX_HOOK_LINES 行)..."
while IFS= read -r file; do
  total_files=$((total_files + 1))
  lines=$(wc -l < "$file" | tr -d ' ')

  if [ "$lines" -gt "$MAX_HOOK_LINES" ]; then
    echo "❌ $file"
    echo "   超過限制: $lines 行 (限制: $MAX_HOOK_LINES 行)"
    violations=$((violations + 1))
  fi
done < <(find src -path "*/hooks/*.ts" -not -path "*/node_modules/*")

# 檢查類型定義文件
echo ""
echo "📝 檢查類型定義文件 (最大 $MAX_TYPE_LINES 行)..."
while IFS= read -r file; do
  total_files=$((total_files + 1))
  lines=$(wc -l < "$file" | tr -d ' ')

  if [ "$lines" -gt "$MAX_TYPE_LINES" ]; then
    echo "❌ $file"
    echo "   超過限制: $lines 行 (限制: $MAX_TYPE_LINES 行)"
    violations=$((violations + 1))
  fi
done < <(find src -name "*types.ts" -not -path "*/node_modules/*")

# 輸出結果
echo ""
echo "================================"
if [ "$violations" -gt 0 ]; then
  echo "🚫 發現 $violations 個文件超過行數限制！"
  echo "📊 總共檢查了 $total_files 個文件"
  echo ""
  echo "💡 請拆分這些文件："
  echo "   1. 將大組件拆分成多個小組件"
  echo "   2. 提取邏輯到自定義 Hook"
  echo "   3. 分離類型定義到多個文件"
  echo ""
  exit 1
else
  echo "✅ 所有 $total_files 個文件符合大小限制"
  exit 0
fi
