#!/usr/bin/env tsx
/**
 * audit:console-log — 生產 code 內 console.* 偵測
 *
 * 生產 code（src/）應走 `@/lib/utils/logger`、不 console.log/error/warn。
 * 理由：
 *   - logger 含 level / 結構化 / Sentry 整合
 *   - console 在 production 亂噴、debug 難
 *
 * 例外：
 *   - scripts/（CLI tool、console 合理）
 *   - tests/（測試輸出）
 *   - 設定檔 / config
 */

import { readFileSync, readdirSync, statSync } from 'fs'
import { join, relative } from 'path'

const ROOT = process.cwd()
const SCAN_DIR = join(ROOT, 'src')

const EXCLUDED = [
  /node_modules/,
  /\.next/,
  /\.test\./,
  /\.spec\./,
  /__tests__/,
  /lib\/utils\/logger\.ts$/, // logger 內可 console
  /components\/ErrorLogger\.tsx$/, // global error fallback、logger 自己可能壞
  /lib\/error-tracking\.ts$/, // error tracking SSOT、自身用 console fallback
]

interface Finding {
  file: string
  line: number
  method: string
  excerpt: string
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
    else if (entry.match(/\.(ts|tsx|js|jsx)$/)) out.push(p)
  }
  return out
}

function checkFile(filePath: string): Finding[] {
  const src = readFileSync(filePath, 'utf8')
  const lines = src.split('\n')
  const findings: Finding[] = []
  lines.forEach((line, idx) => {
    const trimmed = line.trim()
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) return
    if (line.includes('eslint-disable')) return
    // 也檢查「前 3 行」內有 eslint-disable-next-line no-console
    const prevLines = lines.slice(Math.max(0, idx - 3), idx).join('\n')
    if (/eslint-disable-next-line\s+(?:[^,\n]+,\s*)?no-console/.test(prevLines)) return
    const m = line.match(/\bconsole\.(log|error|warn|info|debug)\b/)
    if (m) {
      findings.push({
        file: relative(ROOT, filePath),
        line: idx + 1,
        method: m[1],
        excerpt: trimmed.slice(0, 100),
      })
    }
  })
  return findings
}

function main() {
  const files = walk(SCAN_DIR)
  const allFindings: Finding[] = []
  for (const f of files) {
    allFindings.push(...checkFile(f))
  }

  console.log('')
  console.log('═══ audit:console-log — src/ 內 console.* 偵測 ═══')
  console.log('')
  console.log(`掃描檔：${files.length}`)
  console.log(`finding 數：${allFindings.length}`)
  console.log('')

  if (allFindings.length === 0) {
    console.log('✅ src/ 內無 console.*、全走 logger SSOT')
    return
  }

  // 按 method 統計
  const byMethod = new Map<string, number>()
  for (const f of allFindings) {
    byMethod.set(f.method, (byMethod.get(f.method) || 0) + 1)
  }
  for (const [method, count] of byMethod) {
    console.log(`  console.${method}：${count} 處`)
  }
  console.log('')

  // 列前 20 個
  console.log('━━ Finding（前 20）━━')
  for (const f of allFindings.slice(0, 20)) {
    console.log(`  ${f.file}:${f.line}  console.${f.method}`)
    console.log(`    ${f.excerpt}`)
  }
  if (allFindings.length > 20) {
    console.log(`  ... 還有 ${allFindings.length - 20} 處`)
  }
  console.log('')
  console.log('💡 修法：import { logger } from "@/lib/utils/logger"')
  console.log('   console.error(...) → logger.error(...)')
  console.log('   console.log(...) → logger.debug(...)')
}

main()
