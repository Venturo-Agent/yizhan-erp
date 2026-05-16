#!/usr/bin/env node
/**
 * Venturo Pattern Detectors — 一次跑完所有已知 pattern 的偵測
 *
 * 用法：
 *   node scripts/pattern-detectors/check-all.mjs                # 跑全部
 *   node scripts/pattern-detectors/check-all.mjs P001 P020      # 只跑指定
 *   SUPABASE_ACCESS_TOKEN=xxx SUPABASE_PROJECT_REF=xxx node ... # 覆蓋預設
 *
 * 退出碼：0 = 全 pass、1 = 有 fail（CI 可擋 PR）
 *
 * 設計原則：
 * - 每個 pattern 一個 detector function、回傳 { pass, message, details }
 * - 同時做「代碼層 grep」+「DB 層 SQL」、兩種都要過
 * - 若新增 pattern、加一個 detector function + 註冊到 DETECTORS 陣列即可
 */

import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// ─────────────────────────────────────────────────────────────────────────────
// 設定（可被 env 覆蓋）

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '../..')

// Token / Ref 必須從 env 帶（不再 hardcoded、避免 secret 進 repo）
const SUPA_TOKEN = process.env.SUPABASE_ACCESS_TOKEN
const SUPA_REF = process.env.SUPABASE_PROJECT_REF
if (!SUPA_TOKEN || !SUPA_REF) {
  console.error('❌ need env SUPABASE_ACCESS_TOKEN + SUPABASE_PROJECT_REF')
  process.exit(1)
}

// ─────────────────────────────────────────────────────────────────────────────
// 工具

async function _doFetch(sql, token) {
  return fetch(`https://api.supabase.com/v1/projects/${SUPA_REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  })
}

async function runSql(sql) {
  const res = await _doFetch(sql, SUPA_TOKEN)
  if (!res.ok) {
    throw new Error(`SQL failed (${res.status}): ${await res.text()}`)
  }
  return res.json()
}

function grepRepo(pattern, paths = ['src/']) {
  // grep -rn 失敗（沒匹配）也回傳 — 用 || true 避免 throw
  const cmd = `grep -rnE ${JSON.stringify(pattern)} ${paths.map((p) => `'${p}'`).join(' ')} --include='*.ts' --include='*.tsx' 2>/dev/null || true`
  const out = execSync(cmd, { cwd: REPO_ROOT, encoding: 'utf8' })
  return out
    .split('\n')
    .filter((line) => line.trim() && !line.includes('.test.ts') && !line.includes('.spec.ts'))
}

function ok(name, message = '') {
  return { name, pass: true, message: message || 'OK', details: null }
}

function fail(name, message, details = null) {
  return { name, pass: false, message, details }
}

// ─────────────────────────────────────────────────────────────────────────────
// Detectors

async function detectP001() {
  // P001: 細分三類
  //  (A) hook 短路：if (isAdmin) return true / item / ... — 應拔
  //  (B) layout/page 整頁大鎖：if (!isAdmin) return <UnauthorizedPage /> 或類似 React/JSX — 應改 hasPermission
  //  (C) API endpoint 合法守門：if (!isAdmin) return errorResponse(...) — 合理、不算 fail
  const allHits = grepRepo('if \\(!?isAdmin\\)')
  const A = allHits.filter((h) => /if \(isAdmin\)/.test(h)) // 不含 !
  const B = allHits.filter(
    (h) => /if \(!isAdmin\)/.test(h) && /UnauthorizedPage|return\s*$|return\s+null|return\s*<|return$/.test(h)
  )
  const C = allHits.filter(
    (h) => /if \(!isAdmin\)/.test(h) && /errorResponse|NextResponse|return\s+errorResponse|status:\s*40/.test(h)
  )
  const total = A.length + B.length
  if (total === 0)
    return ok('P001', `0 處短路 / 0 處 layout 大鎖（API 合法守門 ${C.length} 處不算）`)
  return fail(
    'P001',
    `${A.length} 處 hook 短路 + ${B.length} 處 layout/page 大鎖`,
    [
      ...(A.length ? ['── (A) hook 短路 if(isAdmin) ──'] : []),
      ...A.slice(0, 12),
      ...(B.length ? ['── (B) layout/page 大鎖 if(!isAdmin) return <…> ──'] : []),
      ...B.slice(0, 12),
    ]
  )
}

async function detectP004() {
  // P004: 任何 force_rls=true 的 public 表（CLAUDE.md 紅線、workspaces 不准 FORCE）
  const result = await runSql(
    `SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relforcerowsecurity=true ORDER BY c.relname`
  )
  if (result.length === 0) return ok('P004', '0 張 FORCE RLS 表')
  return fail('P004', `${result.length} 張 FORCE RLS 表（紅線違反）`, result)
}

async function detectP016() {
  // P016: workspaces 表所有 policy 不能有 USING:true
  const result = await runSql(
    `SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE schemaname='public' AND tablename='workspaces' AND (qual='true' OR with_check='true')`
  )
  if (result.length === 0) return ok('P016', 'workspaces 4 條 policy 都不是 USING:true')
  return fail('P016', `${result.length} 條 workspaces policy 仍 USING:true`, result)
}

async function detectP017() {
  // P017: rate_limits / ref_cities RLS 必須開
  // (原本還列 _migrations、已於 20260502240000 廢除、由 supabase_migrations.schema_migrations 取代)
  const result = await runSql(
    `SELECT c.relname, c.relrowsecurity AS rls FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN ('rate_limits','ref_cities') AND c.relrowsecurity=false`
  )
  if (result.length === 0) return ok('P017', '系統表 RLS 全開')
  return fail('P017', `${result.length} 張系統表 RLS 沒開`, result)
}

async function detectP018() {
  // P018: employee_permission_overrides 不能再有 USING:true（修了應 = 0）
  const result = await runSql(
    `SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE schemaname='public' AND tablename='employee_permission_overrides' AND (qual='true' OR with_check='true')`
  )
  if (result.length === 0) return ok('P018', 'employee_permission_overrides 已收緊')
  return fail(
    'P018',
    `${result.length} 條 employee_permission_overrides policy 仍 USING:true（CRITICAL 提權漏）`,
    result
  )
}

async function detectP020() {
  // P020: 全站 ALL policy 跟 cmd-specific policy 並存、且 ALL policy 不是「正確守門」的表
  // 「正確守門」白名單寫法：含 service_role / is_super_admin / workspace_id / employee_id / get_current_user_workspace
  // NOT 含上面任一 = 受害（USING:true 或 USING:authenticated 等）
  const sql = `
    SELECT tablename, policyname, qual, with_check
    FROM pg_policies p1
    WHERE schemaname='public'
      AND cmd='ALL'
      AND tablename IN (
        SELECT tablename FROM pg_policies WHERE schemaname='public' AND cmd != 'ALL' GROUP BY tablename
      )
      AND NOT (
        coalesce(qual,'') ILIKE '%service_role%'
        OR coalesce(qual,'') ILIKE '%is_super_admin%'
        OR coalesce(qual,'') ILIKE '%workspace_id%'
        OR coalesce(qual,'') ILIKE '%employee_id%'
        OR coalesce(qual,'') ILIKE '%get_current_user%'
      )
    ORDER BY tablename
  `
  const result = await runSql(sql)
  if (result.length === 0) return ok('P020', '0 條 ALL policy 失守')
  return fail(
    'P020',
    `${result.length} 條 P020 受害 ALL policy（嚴的 cmd-specific 被寬的 ALL 覆蓋）`,
    result.map((r) => `${r.tablename} / ${r.policyname} (qual=${(r.qual || '').slice(0, 60)})`)
  )
}

async function detectP022() {
  // P022: permission-overrides API 必須有守門
  // 偵測：route.ts 必須 import getServerAuth 或 requireTenantAdmin
  const apiFile = 'src/app/api/employees/[employeeId]/permission-overrides/route.ts'
  const fullPath = join(REPO_ROOT, apiFile)
  if (!existsSync(fullPath)) return ok('P022', 'API file removed')
  const content = execSync(`cat '${fullPath}'`, { encoding: 'utf8' })
  const hasGuard =
    content.includes('getServerAuth') ||
    content.includes('requireTenantAdmin') ||
    content.includes('checkIsAdmin')
  if (hasGuard) return ok('P022', 'permission-overrides API 已有守門')
  return fail(
    'P022',
    'permission-overrides API 仍 0 守門（雙層裸奔、CRITICAL）',
    [apiFile]
  )
}

async function detectApiUnguarded() {
  // 通用 detector：列出所有 src/app/api/**/route.ts 沒 getServerAuth / requireTenantAdmin / checkIsAdmin 的
  // 不算 fail（很多公開 API 是合理的）、只列出來給人工 review
  const cmd = `find src/app/api -name 'route.ts' -type f 2>/dev/null | xargs grep -L 'getServerAuth\\|requireTenantAdmin\\|checkIsAdmin' 2>/dev/null || true`
  const out = execSync(cmd, { cwd: REPO_ROOT, encoding: 'utf8' })
  const files = out.split('\n').filter((f) => f.trim())
  return {
    name: 'API_UNGUARDED',
    pass: true, // informational only
    message: `${files.length} 支 API endpoint 無守門（informational、需人工確認是不是公開 API）`,
    details: files.slice(0, 50),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 主流程

const DETECTORS = {
  P001: { fn: detectP001, desc: 'isAdmin 短路全站盤' },
  P004: { fn: detectP004, desc: 'FORCE RLS 違反 CLAUDE.md 紅線' },
  P016: { fn: detectP016, desc: 'workspaces 表 policy USING:true' },
  P017: { fn: detectP017, desc: '系統表 RLS 沒開' },
  P018: { fn: detectP018, desc: 'employee_permission_overrides USING:true' },
  P020: { fn: detectP020, desc: '多 policy 重疊（ALL + cmd-specific）' },
  P022: { fn: detectP022, desc: 'permission-overrides API 雙層裸奔' },
  API_UNGUARDED: { fn: detectApiUnguarded, desc: '無守門 API 清單（informational）' },
}

async function main() {
  const args = process.argv.slice(2)
  const targets = args.length > 0 ? args : Object.keys(DETECTORS)

  console.log(`\n🔍 Venturo Pattern Detectors — ${targets.length} 個 detector\n`)

  const results = []
  for (const id of targets) {
    const d = DETECTORS[id]
    if (!d) {
      console.log(`  ❓ ${id} — 未知 detector`)
      continue
    }
    process.stdout.write(`  ${id} (${d.desc}) ... `)
    try {
      const result = await d.fn()
      results.push(result)
      console.log(result.pass ? `✅ ${result.message}` : `❌ ${result.message}`)
      if (!result.pass && result.details) {
        for (const line of (Array.isArray(result.details) ? result.details : [JSON.stringify(result.details)]).slice(0, 10)) {
          console.log(`      · ${typeof line === 'string' ? line : JSON.stringify(line)}`)
        }
        const total = Array.isArray(result.details) ? result.details.length : 1
        if (total > 10) console.log(`      … ${total - 10} more`)
      }
    } catch (err) {
      results.push(fail(id, `Error: ${err.message}`))
      console.log(`💥 Error: ${err.message}`)
    }
  }

  const failed = results.filter((r) => !r.pass)
  console.log(`\n${'─'.repeat(60)}`)
  console.log(
    failed.length === 0
      ? `✅ All ${results.length} detectors passed`
      : `❌ ${failed.length} / ${results.length} detectors failed: ${failed.map((r) => r.name).join(', ')}`
  )

  process.exit(failed.length === 0 ? 0 : 1)
}

main().catch((err) => {
  console.error(`\n💥 Fatal: ${err.message}`)
  process.exit(2)
})
