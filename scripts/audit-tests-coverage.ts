#!/usr/bin/env tsx
/**
 * audit:tests-coverage — critical service unit test 覆蓋
 *
 * 檢查重要 service 模組有沒有對應 __tests__ 檔。
 * 不檢查覆蓋率百分比（要 vitest coverage）、只看「有 / 無 test 檔」。
 *
 * Critical service 定義（路徑 + 關鍵字）：
 *   - src/lib/hr/*.ts（leave-severance / payroll engine 等）
 *   - src/lib/disbursement/*.ts（fee-distribution / payment-method-policy 等）
 *   - src/lib/finance/*.ts
 *   - src/lib/accounting/*.ts
 *   - src/app/api/hr/* / src/app/api/disbursement/* settle / submit endpoint
 */

import { readdirSync, statSync } from 'fs'
import { join, relative } from 'path'

const ROOT = process.cwd()
const SCAN_DIRS = [
  { dir: join(ROOT, 'src/lib/hr'), label: 'lib/hr' },
  { dir: join(ROOT, 'src/lib/disbursement'), label: 'lib/disbursement' },
  { dir: join(ROOT, 'src/lib/finance'), label: 'lib/finance' },
  { dir: join(ROOT, 'src/lib/accounting'), label: 'lib/accounting' },
]

function listSourceFiles(dir: string): string[] {
  const out: string[] = []
  try {
    for (const entry of readdirSync(dir)) {
      const p = join(dir, entry)
      const st = statSync(p)
      if (st.isDirectory()) {
        if (entry === '__tests__') continue
        // 只看一層 sub-dir
      } else if (
        entry.endsWith('.ts') &&
        !entry.endsWith('.test.ts') &&
        !entry.endsWith('.spec.ts')
      ) {
        out.push(p)
      }
    }
  } catch {}
  return out
}

function hasTestFile(srcFile: string): boolean {
  // 對應 __tests__/{name}.test.ts
  const dir = srcFile.substring(0, srcFile.lastIndexOf('/'))
  const base = srcFile.substring(srcFile.lastIndexOf('/') + 1, srcFile.length - 3) // 去 .ts
  const testPath = join(dir, '__tests__', `${base}.test.ts`)
  try {
    statSync(testPath)
    return true
  } catch {
    return false
  }
}

function main() {
  console.log('')
  console.log('═══ audit:tests-coverage — critical service unit test 覆蓋 ═══')
  console.log('')

  let totalSrc = 0
  let totalCovered = 0
  const missing: { file: string; label: string }[] = []

  for (const { dir, label } of SCAN_DIRS) {
    const srcFiles = listSourceFiles(dir)
    totalSrc += srcFiles.length
    for (const f of srcFiles) {
      if (hasTestFile(f)) {
        totalCovered++
      } else {
        missing.push({ file: relative(ROOT, f), label })
      }
    }
  }

  const ratio = totalSrc > 0 ? (totalCovered / totalSrc) * 100 : 0

  console.log(`Critical service 檔：${totalSrc}`)
  console.log(`含對應 __tests__/*.test.ts：${totalCovered}`)
  console.log(`覆蓋率：${ratio.toFixed(1)}%`)
  console.log('')

  if (missing.length === 0) {
    console.log('✅ 所有 critical service 都有 unit test')
    return
  }

  console.log('━━ 缺 test 的 service ━━')
  // group by label
  const byLabel = new Map<string, string[]>()
  for (const m of missing) {
    if (!byLabel.has(m.label)) byLabel.set(m.label, [])
    byLabel.get(m.label)!.push(m.file)
  }
  for (const [label, files] of byLabel) {
    console.log(`\n  [${label}] ${files.length} 個缺 test:`)
    for (const f of files) {
      console.log(`    ${f}`)
    }
  }
  console.log('')
  console.log('💡 修法：建 src/lib/xxx/__tests__/yyy.test.ts')
  console.log('   範本參考：src/lib/hr/__tests__/leave-severance-calculator.test.ts')
}

main()
