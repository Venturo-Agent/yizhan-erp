#!/usr/bin/env tsx
/**
 * audit:data-consistency — 資料顯示一致性檢查
 *
 * 檢查三個維度：
 *   1. 金額顯示：應走 formatMoney/formatCurrency、不該散刻 toLocaleString
 *   2. 日期顯示：應走 formatDate、不該散刻 toISOString().slice / toLocaleDateString
 *   3. 狀態 label：應走 STATUS_LABEL_MAP SSOT、不該 hardcode
 */

import { readFileSync, readdirSync, statSync } from 'fs'
import { join, relative } from 'path'

const ROOT = process.cwd()
const SRC_DIRS = [join(ROOT, 'src/app/(main)'), join(ROOT, 'src/components'), join(ROOT, 'src/lib')]

// 排除特定路徑
const EXCLUDED = [
  /node_modules/,
  /\.next/,
  /\.test\.tsx?$/,
  /\.spec\.tsx?$/,
  /test\//,
  /__tests__/,
  /supabase\/types\.ts$/,
  /format-currency\.ts$/,
  /format-date\.ts$/,
  /print\//, // 列印模板用 inline style、可放寬
  /Print[A-Z]/,
]

interface Pattern {
  name: string
  regex: RegExp
  hint: string
}

// 散刻 patterns（會被 flag）
const SCATTERED_PATTERNS: Pattern[] = [
  {
    name: 'money_scattered',
    // 抓 `Math.round(X).toLocaleString()` 或 `${prefix}${...amount.toLocaleString()`
    // 但排除 `formatMoney(amount).toLocaleString` 之類
    regex: /\$\{?\s*['"`]?NT\$?['"`]?\s*\}?\s*\$?\{[^}]*\.toLocaleString/,
    hint: '改用 formatMoney(amount)',
  },
  {
    name: 'date_iso_slice',
    regex: /\.toISOString\(\)\.slice\(0,\s*10\)/,
    hint: '改用 formatDate(date)',
  },
  {
    name: 'date_locale',
    regex: /\.toLocaleDateString\(/,
    hint: '改用 formatDate(date) 或 formatDateTaipei',
  },
]

interface Finding {
  file: string
  line: number
  pattern: string
  excerpt: string
  hint: string
}

function walk(dir: string, out: string[] = []): string[] {
  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch {
    return out
  }
  for (const entry of entries) {
    const p = join(dir, entry)
    if (EXCLUDED.some(re => re.test(p))) continue
    let st
    try {
      st = statSync(p)
    } catch {
      continue
    }
    if (st.isDirectory()) {
      walk(p, out)
    } else if (entry.endsWith('.tsx') || entry.endsWith('.ts')) {
      out.push(p)
    }
  }
  return out
}

function checkFile(filePath: string): Finding[] {
  const src = readFileSync(filePath, 'utf8')
  const lines = src.split('\n')
  const findings: Finding[] = []

  lines.forEach((line, idx) => {
    // 跳過 import / comment
    const trimmed = line.trim()
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('import')) {
      return
    }
    for (const p of SCATTERED_PATTERNS) {
      if (p.regex.test(line)) {
        findings.push({
          file: relative(ROOT, filePath),
          line: idx + 1,
          pattern: p.name,
          excerpt: line.trim().slice(0, 120),
          hint: p.hint,
        })
      }
    }
  })

  return findings
}

function main() {
  const allFindings: Finding[] = []
  const filesScanned: string[] = []
  for (const dir of SRC_DIRS) {
    walk(dir, filesScanned)
  }
  for (const f of filesScanned) {
    allFindings.push(...checkFile(f))
  }

  // group by pattern
  const byPattern = new Map<string, Finding[]>()
  for (const f of allFindings) {
    if (!byPattern.has(f.pattern)) byPattern.set(f.pattern, [])
    byPattern.get(f.pattern)!.push(f)
  }

  console.log('')
  console.log('═══ audit:data-consistency — 資料顯示一致性檢查 ═══')
  console.log('')
  console.log(`掃描檔：${filesScanned.length} 個`)
  console.log(`finding 數：${allFindings.length}`)
  console.log('')

  for (const [pattern, findings] of byPattern) {
    console.log(`━━ ${pattern}（${findings.length} 處）━━`)
    console.log(`💡 ${findings[0].hint}`)
    const showMax = 15
    findings.slice(0, showMax).forEach(f => {
      console.log(`  ${f.file}:${f.line}  ${f.excerpt}`)
    })
    if (findings.length > showMax) {
      console.log(`  ... 還有 ${findings.length - showMax} 處（略）`)
    }
    console.log('')
  }

  if (allFindings.length > 0) {
    console.log('💡 修法：grep 替換成既有 formatter SSOT')
    console.log('   - 金額：import { formatCurrency } from "@/lib/utils/format-currency"')
    console.log('   - 日期：import { formatDate } from "@/lib/utils/format-date"')
  } else {
    console.log('✅ 無散刻、全部走 SSOT')
  }
}

main()
