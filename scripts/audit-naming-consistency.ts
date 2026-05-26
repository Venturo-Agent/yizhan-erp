#!/usr/bin/env tsx
/**
 * audit:naming-consistency — 業務術語混用偵測
 *
 * 對齊 03-data-consistency-blueprint.md R4：
 *   - 請款：對外要錢
 *   - 付款：實際出錢
 *   - 收款：收進來
 *   - 出納：實際匯款 / 領現的會計動作
 *   - 出帳：公司資產減少的會計事件
 *   - 結算：把多筆 pending 收尾、產一張正式單
 *
 * 抓「該分清楚但混用」的 file：
 *   - 同一 file 同一個 entity（譬如 payment_request）但中文混用「請款 / 付款」
 *   - 同一 file 出現「出納 + 出帳」描述同一動作
 */

import { readFileSync, readdirSync, statSync } from 'fs'
import { join, relative } from 'path'

const ROOT = process.cwd()
const SCAN_DIRS = [
  join(ROOT, 'src/app/(main)'),
  join(ROOT, 'src/components'),
  join(ROOT, 'src/lib'),
]

const EXCLUDED = [
  /\.test\.tsx?$/,
  /\.spec\.tsx?$/,
  /__tests__/,
  /node_modules/,
  /Print[A-Z]/,
  /labels\.ts$/, // labels SSOT 可同時定義多個術語
]

interface Finding {
  file: string
  terms: string[]
  excerpt: string[]
}

// 容易混用的術語對
const CONFUSED_PAIRS: Array<{ name: string; terms: string[] }> = [
  {
    name: '請款 vs 付款',
    terms: ['請款', '付款'],
  },
  {
    name: '出納 vs 出帳',
    terms: ['出納單', '出帳單'],
  },
  {
    name: '結算 vs 結帳',
    terms: ['結算', '結帳'],
  },
  {
    name: '訂單 vs 訂單號 vs 訂購單',
    terms: ['訂購單', '訂貨單'],
  },
]

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
    if (st.isDirectory()) walk(p, out)
    else if (entry.endsWith('.tsx') || entry.endsWith('.ts')) out.push(p)
  }
  return out
}

function checkFile(filePath: string): Finding[] {
  const src = readFileSync(filePath, 'utf8')
  const findings: Finding[] = []

  for (const pair of CONFUSED_PAIRS) {
    const foundTerms = pair.terms.filter(t => src.includes(t))
    if (foundTerms.length >= 2) {
      // 取每個 term 的 line excerpt
      const excerpts: string[] = []
      const lines = src.split('\n')
      for (const term of foundTerms) {
        const line = lines.find(l => l.includes(term))
        if (line) excerpts.push(`  [${term}] ${line.trim().slice(0, 80)}`)
      }
      findings.push({
        file: relative(ROOT, filePath),
        terms: foundTerms,
        excerpt: excerpts,
      })
    }
  }

  return findings
}

function main() {
  const files: string[] = []
  for (const dir of SCAN_DIRS) walk(dir, files)

  const allFindings: Finding[] = []
  for (const f of files) {
    allFindings.push(...checkFile(f))
  }

  console.log('')
  console.log('═══ audit:naming-consistency — 業務術語混用檢查 ═══')
  console.log('')
  console.log(`掃描檔：${files.length}`)
  console.log(`混用 finding：${allFindings.length}`)
  console.log('')

  if (allFindings.length === 0) {
    console.log('✅ 沒有業務術語混用')
    return
  }

  // group by file
  const byFile = new Map<string, Finding[]>()
  for (const f of allFindings) {
    if (!byFile.has(f.file)) byFile.set(f.file, [])
    byFile.get(f.file)!.push(f)
  }

  const showMax = 15
  let shown = 0
  for (const [file, findings] of byFile) {
    if (shown >= showMax) break
    console.log(`  ${file}`)
    for (const f of findings) {
      console.log(`    混用：${f.terms.join(' / ')}`)
      f.excerpt.forEach(e => console.log(e))
    }
    shown++
  }
  if (byFile.size > showMax) {
    console.log(`  ... 還有 ${byFile.size - showMax} 個檔`)
  }
  console.log('')
  console.log('💡 對齊 03-data-consistency-blueprint.md R4 規範：')
  console.log('   - 請款（向公司要錢）vs 付款（公司付出）：不同概念、不混用')
  console.log('   - 出納（會計動作）vs 出帳（事件）：用詞分清')
}

main()
