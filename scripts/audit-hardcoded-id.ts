#!/usr/bin/env tsx
/**
 * audit:hardcoded-id — 偵測 src/ 內 hardcoded UUID
 *
 * 風險：
 *   - workspace_id / role_id / user_id 寫死 → 跨 workspace 滲透
 *   - 對齊鐵律 #9（沒有特權、沒有 hardcode workspace 判斷）
 *
 * 例外：
 *   - 註解內的範例 UUID
 *   - migration / seed 用 reference UUID（譬如 placeholder）
 *   - test fixture
 */

import { readFileSync, readdirSync, statSync } from 'fs'
import { join, relative } from 'path'

const ROOT = process.cwd()
const SCAN_DIR = join(ROOT, 'src')

const EXCLUDED = [/node_modules/, /\.test\./, /\.spec\./, /__tests__/, /\.fixture\./]

// UUID v4 pattern
const UUID_REGEX = /['"`][0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}['"`]/i

interface Finding {
  file: string
  line: number
  uuid: string
  excerpt: string
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
    // 跳過明示「test / mock / sample / example」相關
    if (/test|mock|sample|example|fixture/i.test(line)) return
    // 跳過 process.env 的 fallback pattern：`process.env.X || 'uuid'`
    if (/process\.env\.[A-Z_]+\s*\|\|/.test(line)) return
    // 跳過 UUID v4 generator template `'1000...'.replace`
    if (/['"`]10000000-1000-4000-8000-100000000000['"`]\.replace/.test(line)) return
    // 跳過 sentinel zero UUID（譬如空 IN clause 用）
    if (/['"`]00000000-0000-0000-0000-000000000000['"`]/.test(line)) return
    const m = line.match(UUID_REGEX)
    if (m) {
      findings.push({
        file: relative(ROOT, filePath),
        line: idx + 1,
        uuid: m[0],
        excerpt: trimmed.slice(0, 120),
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
  console.log('═══ audit:hardcoded-id — src/ 內 hardcoded UUID 偵測 ═══')
  console.log('')
  console.log(`掃描檔：${files.length}`)
  console.log(`finding 數：${allFindings.length}`)
  console.log('')

  if (allFindings.length === 0) {
    console.log('✅ 無 hardcoded UUID')
    return
  }

  console.log('━━ Finding（前 20）━━')
  for (const f of allFindings.slice(0, 20)) {
    console.log(`  ${f.file}:${f.line}  ${f.uuid}`)
    console.log(`    ${f.excerpt}`)
  }
  if (allFindings.length > 20) {
    console.log(`  ... 還有 ${allFindings.length - 20} 處`)
  }
  console.log('')
  console.log('💡 修法：')
  console.log('   - workspace_id：用 auth.data.workspaceId / RLS 自動過濾')
  console.log('   - role_id：用 SSOT lookup 或從 DB 撈')
  console.log('   - 範例 UUID 移到註解 / 加 eslint-disable')
}

main()
