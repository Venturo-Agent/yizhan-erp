#!/usr/bin/env tsx
/**
 * audit:i18n-coverage — 中文 hardcode 統計
 *
 * 純盤點：列出 src/ 內 component / page 含 hardcoded 中文字串、未走 LABELS SSOT。
 * 為未來國際化準備、不阻 merge。
 *
 * 抓 pattern：
 *   - JSX 內裸中文（`<span>中文</span>`、`>{'中文'}</span>`）
 *   - props 內中文字符串（`label="中文"` / `placeholder="中文"`）
 *
 * 排除：
 *   - constants/labels.ts（SSOT 本身）
 *   - 註解內中文
 *   - Print* component（列印模板可 inline）
 *   - 已 import LABELS / 已用 SSOT 的檔（粗略：含 LABELS / _LABELS 字串）
 */

import { readFileSync, readdirSync, statSync } from 'fs'
import { join, relative } from 'path'

const ROOT = process.cwd()
const SCAN_DIR = join(ROOT, 'src/app/(main)')

const EXCLUDED = [
  /labels\.ts$/,
  /labels\.tsx$/,
  /constants\//,
  /\.test\./,
  /\.spec\./,
  /__tests__/,
  /Print[A-Z]/,
]

const CJK_REGEX = /[一-鿿]/  // 中文字符範圍

interface FileStat {
  file: string
  cjkLineCount: number
  usesLabels: boolean
}

function walk(dir: string, out: string[] = []): string[] {
  let entries: string[]
  try { entries = readdirSync(dir) } catch { return out }
  for (const entry of entries) {
    const p = join(dir, entry)
    if (EXCLUDED.some(re => re.test(p))) continue
    let st
    try { st = statSync(p) } catch { continue }
    if (st.isDirectory()) walk(p, out)
    else if (entry.endsWith('.tsx')) out.push(p)
  }
  return out
}

function analyzeFile(filePath: string): FileStat {
  const src = readFileSync(filePath, 'utf8')
  const lines = src.split('\n')

  // 是否使用 LABELS SSOT
  const usesLabels = /LABELS|_LABELS|labels\./.test(src)

  // 計算含中文的 code line（排除註解）
  let cjkLineCount = 0
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue
    if (CJK_REGEX.test(line)) cjkLineCount++
  }

  return {
    file: relative(ROOT, filePath),
    cjkLineCount,
    usesLabels,
  }
}

function main() {
  const files = walk(SCAN_DIR)
  const stats = files.map(analyzeFile).filter(s => s.cjkLineCount > 0)

  const totalCjkLines = stats.reduce((s, x) => s + x.cjkLineCount, 0)
  const usingLabels = stats.filter(s => s.usesLabels).length
  const notUsingLabels = stats.filter(s => !s.usesLabels && s.cjkLineCount > 0)

  console.log('')
  console.log('═══ audit:i18n-coverage — 中文 hardcode 統計 ═══')
  console.log('')
  console.log(`掃描檔（.tsx）：${files.length}`)
  console.log(`含中文 line 的檔：${stats.length}`)
  console.log(`中文 line 總數：${totalCjkLines}`)
  console.log(`✅ 走 LABELS SSOT：${usingLabels}`)
  console.log(`⚠ 沒走 LABELS（hardcode 中文）：${notUsingLabels.length}`)
  console.log('')

  if (notUsingLabels.length === 0) {
    console.log('✅ 全部含中文檔都走 LABELS SSOT')
    return
  }

  // 列前 20 重 hardcode 的檔
  const sorted = notUsingLabels.sort((a, b) => b.cjkLineCount - a.cjkLineCount)
  console.log('━━ 沒走 LABELS、中文 line 前 20 名 ━━')
  for (const s of sorted.slice(0, 20)) {
    console.log(`  ${s.cjkLineCount} 行  ${s.file}`)
  }
  if (sorted.length > 20) {
    console.log(`  ... 還有 ${sorted.length - 20} 個檔`)
  }
  console.log('')
  console.log('💡 建議：抽 LABELS 進 constants/labels.ts、JSX 內走 LABELS.xxx')
  console.log('   未來國際化（i18n）時這份 SSOT 是切換語言的關鍵')
}

main()
