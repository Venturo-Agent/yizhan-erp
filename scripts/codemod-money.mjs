#!/usr/bin/env node
/**
 * Codemod: 把散刻 `$${n.toLocaleString()}` 在 JSX 純內容上下文中改成 `<Money amount={n} />`
 *
 * 嚴格規則：只在「JSX 直接內容」場景動，不動任何 string template / toast / log / note。
 *
 * 三種匹配 pattern（必須在 JSX text node 中、前後都是 JSX 邊界）：
 *   1. `>$${expr.toLocaleString()}<`     →  `><Money amount={expr} /><`
 *   2. `>${expr.toLocaleString()}<`      →  純千分位、不加 $、用 <Money showSymbol={false}>
 *   3. 不動：在 ` ` 反引號 string template 中 / 在 .push() / toast / `tour_code` 等識別碼相關 / `(...) => (...)` 純文字 callback / 同一行有引號開頭
 *
 * 跑：node scripts/codemod-money.mjs <file1> <file2> ...
 */

import fs from 'node:fs'
import path from 'node:path'

const MONEY_IMPORT = "import { Money } from '@/components/ui/money'"

function processFile(filepath) {
  let src = fs.readFileSync(filepath, 'utf8')
  const original = src
  let count = 0

  const lines = src.split('\n')
  const newLines = lines.map((line) => {
    // 整行內如果含反引號開始的 template literal、跳過（粗略保護）
    // 實際 JSX 行不會有反引號（除非用 inline template、極少見）
    if (line.includes('`')) return line

    // 也跳過註解行
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) return line

    // 跳過 import / type / const default 等不應該動的行
    if (/^\s*(import|export|const|let|var|return|type|interface)\b/.test(line)) {
      // 但 return ( 後面的 JSX 可能在後續行、所以只跳過明顯非 JSX 的單行
      if (!line.includes('<') && !line.includes('{') && !line.includes('}')) return line
    }

    let newLine = line
    let lineCount = 0

    // pattern 1: `>$${expr.toLocaleString()}<` 或行內 JSX text node
    // 匹配條件：前有 `>` 或 `}` 或行首空白、後緊接 `<` 或 `}` 或行尾空白
    // 為精確匹配「JSX 純內容」、要求左邊是 `>` 或行首縮排、右邊是 `<` 或結尾
    //
    // 簡化：只處理「行內出現 `\$\{xxx\.toLocaleString\(\)\}`」、且該 token 不在引號內
    //
    // 我用更嚴格 regex：
    //   (>|^\s+)\s*\$\{([a-zA-Z_$][\w.?\[\]'"]*?)\.toLocaleString\(\)\}\s*(<|$)
    // 注意：line-by-line 已經是單行了、^ 跟 $ 都是行首/行尾、不需要 m flag
    const re1 = /(^[\s\t]*|[>}])\s*\$\{([a-zA-Z_$][\w.?[\]'"!]*)\.toLocaleString\(\)\}\s*(<|$)/g
    newLine = newLine.replace(re1, (full, before, expr, after) => {
      // 排除 expr 含 ?. 後面再 .toLocaleString — 變數型態可能 undefined、Money 內部會 fallback
      lineCount++
      const cleanBefore = before === '^\\s+' ? '' : before
      return `${before}<Money amount={${expr}} />${after === '$' ? '' : after}`
    })

    // pattern 2: 開頭 `$` 自己加、後面 toLocaleString — 處理 `>${n.toLocaleString()}<` 純千分位
    // 規格：純千分位 → `<Money amount={n} showSymbol={false} />`
    const re2 = /(^[\s\t]*|[>}])\s*\{([a-zA-Z_$][\w.?[\]'"!]*)\.toLocaleString\(\)\}\s*(<|$)/g
    // 注意：re2 跟 re1 衝突（re1 已經吃了 ${...}）— re2 必須在 re1 之後跑、且要排除已經被改寫的 `<Money`
    if (!newLine.includes('<Money')) {
      newLine = newLine.replace(re2, (full, before, expr, after) => {
        lineCount++
        return `${before}<Money amount={${expr}} showSymbol={false} />${after === '$' ? '' : after}`
      })
    }

    if (lineCount > 0) count += lineCount
    return newLine
  })

  src = newLines.join('\n')

  if (count === 0) {
    return { filepath, count: 0 }
  }

  // 補 import
  if (!src.includes("from '@/components/ui/money'")) {
    const importInsertRe = /^(import\s+[\s\S]+?from\s+['"][^'"]+['"];?\s*\n)/m
    if (importInsertRe.test(src)) {
      src = src.replace(importInsertRe, (m) => m + MONEY_IMPORT + '\n')
    } else {
      src = MONEY_IMPORT + '\n' + src
    }
  }

  if (src !== original) {
    fs.writeFileSync(filepath, src, 'utf8')
  }

  return { filepath, count }
}

const files = process.argv.slice(2)
if (files.length === 0) {
  console.error('Usage: node scripts/codemod-money.mjs <file1> <file2> ...')
  process.exit(1)
}

let total = 0
for (const f of files) {
  const abs = path.resolve(f)
  if (!fs.existsSync(abs)) {
    console.error(`SKIP (not found): ${f}`)
    continue
  }
  const { count } = processFile(abs)
  if (count > 0) {
    console.log(`  ${count} replacements in ${f}`)
  }
  total += count
}
console.log(`\nTotal: ${total} replacements`)
