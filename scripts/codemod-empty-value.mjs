#!/usr/bin/env node
/**
 * Codemod: 把散刻 `{xxx || '-'}` 在 JSX 上下文中改成 `{xxx || <EmptyValue />}`
 *
 * 嚴格規則（每行檢查）：
 *   - 必須有 `|| '-'` 或 `|| "-"` 或 `: '-'`（後者是 ternary fallback）
 *   - **必須**含 `{`（在 JSX expression 內）
 *   - **不能**含反引號 `（避開 string template）
 *   - **不能**有 `style=` / `className=` / `title=` / `placeholder=` 等屬性 prefix（這行有屬性的話、寧可保守跳）
 *   - **不能**是 `const` / `let` / `var` / `return` / `import` / `export` 開頭（純 statement、用字串 fallback）
 *
 * 跑：node scripts/codemod-empty-value.mjs <file1> <file2> ...
 */

import fs from 'node:fs'
import path from 'node:path'

const EMPTY_IMPORT = "import { EmptyValue } from '@/components/ui/empty-value'"

function processFile(filepath) {
  let src = fs.readFileSync(filepath, 'utf8')
  const original = src
  let count = 0

  const lines = src.split('\n')
  const newLines = lines.map((line) => {
    // 跳過：含 backtick → 可能 string template
    if (line.includes('`')) return line
    // 跳過：危險屬性（會把 '-' 當成屬性值的字串）
    // className 不在黑名單裡、因為 className="..." 是字串字面量、後面才出現 `{... || '-'}` 在 JSX 文字中、可以安全替換
    if (/\b(?:style|title|placeholder|alt|aria-label|href|src|onClick|defaultValue|onChange|onBlur|onFocus|onKeyDown|onKeyUp|onSubmit|key=|name=|type=|value=|htmlFor=|disabled=|checked=|selected=|readOnly=|maxLength=|minLength=)=/.test(line)) {
      return line
    }
    // 也跳過：屬性 `{xxx || '-'}` 直接做為 prop value、形如 `prop={a || '-'}`
    if (/\b\w+=\{[^{}]*\|\|\s*['"]-['"]/.test(line)) {
      return line
    }
    // 跳過：是註解 / import / 非 JSX 語句
    const trimmed = line.trim()
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return line
    if (/^\s*(import|export|const|let|var|return|type|interface|function|class)\b/.test(line)) {
      // 排除明顯非 JSX 的
      // 但 return ( ... 後面接 JSX 可能會被排掉 — 為保守、要求行裡有 `{ ... || '-'}` JSX expression
      // 仍然跳過、避免改錯 logic 程式
      return line
    }

    let newLine = line
    let lineCount = 0

    // pattern A: `{ xxx || '-' }` 或 `{xxx||'-'}` — 簡單變數 fallback
    // 簡單變數 = `[a-zA-Z_$][\w.?\[\]'"]*`
    // 兩端必須是 `{` 跟 `}`
    const reA = /\{(\s*[^{}]+?\s*)\|\|\s*('-'|"-")\s*\}/g
    newLine = newLine.replace(reA, (full, expr, quoted) => {
      // expr 內不能有 `<`、避免吃到已經是 JSX 的內容
      if (expr.includes('<')) return full
      lineCount++
      return `{${expr.trim()} || <EmptyValue />}`
    })

    // pattern B: `{ xxx ? yyy : '-' }` ternary — 變 `{ xxx ? yyy : <EmptyValue /> }`
    // 太複雜、容易 false positive、保守跳

    if (lineCount > 0) count += lineCount
    return newLine
  })

  src = newLines.join('\n')

  if (count === 0) {
    return { filepath, count: 0 }
  }

  // 補 import
  if (!src.includes("from '@/components/ui/empty-value'")) {
    const importInsertRe = /^(import\s+[\s\S]+?from\s+['"][^'"]+['"];?\s*\n)/m
    if (importInsertRe.test(src)) {
      src = src.replace(importInsertRe, (m) => m + EMPTY_IMPORT + '\n')
    } else {
      src = EMPTY_IMPORT + '\n' + src
    }
  }

  if (src !== original) {
    fs.writeFileSync(filepath, src, 'utf8')
  }

  return { filepath, count }
}

const files = process.argv.slice(2)
if (files.length === 0) {
  console.error('Usage: node scripts/codemod-empty-value.mjs <file1> <file2> ...')
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
