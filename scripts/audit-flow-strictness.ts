#!/usr/bin/env tsx
/**
 * audit:flow-strictness — 流程嚴謹度檢查
 *
 * 對「金流 / 關鍵狀態轉換」endpoint 檢查 4 個關鍵 pattern：
 *   1. admin client（繞 RLS、後端自己守）
 *   2. 樂觀鎖（.eq('status', ...) filter + 之後 update）
 *   3. 補償回滾（成功部分失敗 → 砍前面建的）
 *   4. recordApiAuditContext（audit log 留痕）
 *
 * critical endpoint 識別：path 含 payment / receipt / disbursement / bonus / salary /
 *                                settle / submit / confirm / close / approve / void
 */

import { readFileSync, readdirSync, statSync } from 'fs'
import { join, relative } from 'path'

const ROOT = process.cwd()
const API_DIR = join(ROOT, 'src/app/api')

const CRITICAL_KEYWORDS = [
  'payment',
  'receipt',
  'disbursement',
  'bonus',
  'salary',
  'settle',
  'submit',
  'confirm',
  'close',
  'approve',
  'void',
  'finance',
]

const HTTP_MUTATION_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'] as const
type HttpMutation = (typeof HTTP_MUTATION_METHODS)[number]

interface Check {
  name: string
  pattern: RegExp
  required: 'must' | 'should'
  hint: string
}

const CHECKS: Check[] = [
  {
    name: 'admin_client',
    pattern: /getSupabaseAdminClient/,
    required: 'should',
    hint: '金流變動建議用 admin client + 在 API 自守 capability、避免 RLS 半成功',
  },
  {
    name: 'optimistic_lock',
    pattern: /\.eq\(['"`]status['"`]/,
    required: 'should',
    hint: '改 status 前用 .eq("status", expected) 樂觀鎖、避免 race（其他 caller 已改）',
  },
  {
    name: 'compensation_rollback',
    pattern: /\.delete\(\)\.eq.*pr\.id|payment_request_items.*delete|order.*delete.*compensation|補償砍/,
    required: 'should',
    hint: '多 step insert / update 任一失敗、要砍掉前面建的（補償回滾）',
  },
  {
    name: 'audit_context',
    pattern: /recordApiAuditContext/,
    required: 'must',
    hint: '金流變動必須 recordApiAuditContext、否則無法追溯誰改的',
  },
]

interface Finding {
  file: string
  method: HttpMutation
  missing: { check: string; required: string; hint: string }[]
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry)
    const st = statSync(p)
    if (st.isDirectory()) {
      walk(p, out)
    } else if (entry === 'route.ts' || entry === 'route.tsx') {
      out.push(p)
    }
  }
  return out
}

function isCritical(filePath: string): boolean {
  const rel = relative(ROOT, filePath).toLowerCase()
  return CRITICAL_KEYWORDS.some(k => rel.includes(k))
}

function isExcluded(filePath: string): boolean {
  const rel = relative(ROOT, filePath).replace(/\\/g, '/')
  return (
    rel.includes('api/auth/') ||
    rel.includes('api/public/') ||
    rel.includes('api/webhooks/') ||
    rel.includes('api/cron/') ||
    rel.includes('api/_test/') ||
    rel.includes('api/test/') ||
    // 純預覽 / 試算 endpoint、不改 DB、不需要 audit log
    rel.includes('preview-') ||
    rel.includes('-preview') ||
    rel.includes('estimate-') ||
    rel.includes('-estimate') ||
    // 設定類 CRUD（accounting_subjects / expense_categories / payment_methods）
    // 是公司設定、不是金流交易；admin_client / optimistic_lock 不適用
    rel.includes('finance/accounting-subjects') ||
    rel.includes('finance/expense-categories') ||
    rel.includes('finance/payment-methods')
  )
}

function checkFile(filePath: string): Finding[] {
  const src = readFileSync(filePath, 'utf8')
  const findings: Finding[] = []

  for (const method of HTTP_MUTATION_METHODS) {
    const exportRegex = new RegExp(
      `export\\s+(async\\s+function|const)\\s+${method}\\b`,
    )
    if (!exportRegex.test(src)) continue

    const missing: { check: string; required: string; hint: string }[] = []
    for (const check of CHECKS) {
      if (!check.pattern.test(src)) {
        missing.push({ check: check.name, required: check.required, hint: check.hint })
      }
    }
    if (missing.length > 0) {
      findings.push({
        file: relative(ROOT, filePath),
        method,
        missing,
      })
    }
  }

  return findings
}

function main() {
  const allFiles = walk(API_DIR)
  const criticalFiles = allFiles.filter(f => isCritical(f) && !isExcluded(f))

  const allFindings: Finding[] = []
  for (const f of criticalFiles) {
    allFindings.push(...checkFile(f))
  }

  console.log('')
  console.log('═══ audit:flow-strictness — 金流流程嚴謹度檢查 ═══')
  console.log('')
  console.log(`critical endpoint 檔：${criticalFiles.length}`)
  console.log(`finding 數：${allFindings.length}`)
  console.log('')

  if (allFindings.length === 0) {
    console.log('✅ 全綠')
    return
  }

  let mustCount = 0
  let shouldCount = 0
  for (const f of allFindings) {
    for (const m of f.missing) {
      if (m.required === 'must') mustCount++
      else shouldCount++
    }
  }
  console.log(`必修 (must)：${mustCount}`)
  console.log(`建議 (should)：${shouldCount}`)
  console.log('')

  // 按檔 group + filter must only first
  console.log('━━ 必修 (must) finding ━━')
  for (const f of allFindings) {
    const musts = f.missing.filter(m => m.required === 'must')
    if (musts.length === 0) continue
    console.log(`  ${f.file} [${f.method}]`)
    for (const m of musts) {
      console.log(`    ✗ ${m.check}：${m.hint}`)
    }
  }
  console.log('')
  console.log('━━ 建議 (should) finding（前 20）━━')
  let shown = 0
  for (const f of allFindings) {
    const shoulds = f.missing.filter(m => m.required === 'should')
    if (shoulds.length === 0) continue
    if (shown >= 20) break
    console.log(`  ${f.file} [${f.method}]`)
    for (const m of shoulds) {
      console.log(`    ⚠ ${m.check}`)
    }
    shown++
  }

  if (mustCount > 0) process.exit(1)
}

main()
