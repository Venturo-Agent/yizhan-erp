#!/bin/bash

# 🔍 any 類型使用檢查腳本
# 禁止使用 any 類型

set -e

echo "🔍 開始檢查 any 類型使用..."
echo "================================"

violations=0

# 檢查 ": any" 模式
echo ""
echo "🔎 搜索 ': any' 模式..."
while IFS= read -r line; do
  echo "❌ $line"
  violations=$((violations + 1))
done < <(grep -rn ": any\b" src --include="*.ts" --include="*.tsx" 2>/dev/null || true)

# 檢查 "as any" 模式
echo ""
echo "🔎 搜索 'as any' 模式..."
while IFS= read -r line; do
  echo "❌ $line"
  violations=$((violations + 1))
done < <(grep -rn "as any" src --include="*.ts" --include="*.tsx" 2>/dev/null || true)

# 檢查 "any[]" 模式
echo ""
echo "🔎 搜索 'any[]' 模式..."
while IFS= read -r line; do
  echo "❌ $line"
  violations=$((violations + 1))
done < <(grep -rn "any\[\]" src --include="*.ts" --include="*.tsx" 2>/dev/null || true)

# 檢查 "Array<any>" 模式
echo ""
echo "🔎 搜索 'Array<any>' 模式..."
while IFS= read -r line; do
  echo "❌ $line"
  violations=$((violations + 1))
done < <(grep -rn "Array<any>" src --include="*.ts" --include="*.tsx" 2>/dev/null || true)

# 輸出結果
echo ""
echo "================================"
if [ "$violations" -gt 0 ]; then
  echo "🚫 發現 $violations 處使用 any 類型！"
  echo ""
  echo "💡 請替換為明確的類型定義："
  echo "   1. 定義 interface 或 type"
  echo "   2. 使用泛型 <T>"
  echo "   3. 使用 unknown（如果真的不知道類型）"
  echo "   4. 使用聯合類型 (string | number)"
  echo ""
  echo "📚 參考："
  echo "   https://www.typescriptlang.org/docs/handbook/2/everyday-types.html"
  echo ""
  exit 1
else
  echo "✅ 沒有使用 any 類型"
  exit 0
fi
