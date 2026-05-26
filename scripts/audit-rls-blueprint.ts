#!/usr/bin/env tsx
/**
 * audit-rls-blueprint.ts — production RLS / blueprint 6 層偏離偵測
 *
 * 用法：
 *   npm run audit:rls                          # 跑全部、CI 模式（exit 1 if error）
 *   npm run audit:rls -- --warn-only           # 不擋 CI、只列 warning
 *   npm run audit:rls -- --layer=L5            # 只跑指定層（L1-L6）
 *   npm run audit:rls -- --format=markdown     # 輸出 markdown report
 *   npm run audit:rls -- --skip-db             # 只跑 code grep、不查 DB
 *
 * 環境變數（DB 部分用、code grep 部分不需要）：
 *   SUPABASE_DB_URL — pg connection string（CI 必要、Mac 本地走不通可省略）
 *
 * 設計：
 *   - 每個 detector 對應 blueprint 6 層之一
 *   - severity: 'error' = 紅線（CI fail）/ 'warn' = 建議（不擋）
 *   - 紅線聚焦 L5 RLS + L6 SSOT、L1-L4 因映射不齊只 warn
 *   - 退出碼：0 = 全綠 / 1 = 有 error / 2 = 環境問題（CI 擋 merge）
 *
 * 連線策略：
 *   - 走 psql 子程序 + SUPABASE_DB_URL（Linux CI IPv6 通、Mac IPv6 不通）
 *   - Mac 本地：DB 部分自動標 skipped、只跑 code grep
 *   - CI Linux：跑全套
 *
 * 對應 blueprint（2026-05-13）：
 *   L1 workspace_features    Feature Gate
 *   L2 role_capabilities     Capability
 *   L3 brands/branches/depts 三維 Scope
 *   L4 is_row_editable       狀態守門
 *   L5 RLS policies          資料庫紅線 ← 自動化主場
 *   L6 中央 module SSOT      防呆 ← 自動化主場
 */

import { execSync, spawnSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { dirname, resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ALL_MODULES, getHrExposedModules } from '../src/modules/_registry'
import { deriveCapabilityCodes } from '../src/modules/_define'
import { FEATURES } from '../src/lib/permissions/features'
import { MODULES as MODULE_TABS_MODULES } from '../src/lib/permissions/module-tabs'
import { CAPABILITIES } from '../src/lib/permissions/capabilities'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '..')

const SUPA_DB_URL = process.env.SUPABASE_DB_URL

// ─────────────────────────────────────────────────────────────────────────────
// 參數解析

const argv = process.argv.slice(2)
const flags = {
  warnOnly: argv.includes('--warn-only'),
  skipDb: argv.includes('--skip-db'),
  format: argv.find(a => a.startsWith('--format='))?.split('=')[1] ?? 'console',
  layer: argv.find(a => a.startsWith('--layer='))?.split('=')[1] ?? 'ALL',
}

// 自動偵測：能不能連 DB
let DB_AVAILABLE = false
if (!flags.skipDb && SUPA_DB_URL) {
  // 透過 psql 跑 SELECT 1 + 短 timeout 試水溫
  const probe = spawnSync('psql', [SUPA_DB_URL, '-tA', '-c', 'SELECT 1', '-v', 'ON_ERROR_STOP=1'], {
    encoding: 'utf8',
    timeout: 8000,
    env: { ...process.env, PGCONNECT_TIMEOUT: '5' },
  })
  DB_AVAILABLE = probe.status === 0
  if (!DB_AVAILABLE) {
    console.warn('⚠️  psql 連 DB 失敗（Mac IPv6 限制？）— DB 部分自動 skip、只跑 code grep。')
    console.warn(`   probe stderr: ${(probe.stderr || '').split('\n')[0]}`)
  }
} else if (!SUPA_DB_URL && !flags.skipDb) {
  console.warn('⚠️  缺 SUPABASE_DB_URL — DB 部分自動 skip、只跑 code grep。')
}

// ─────────────────────────────────────────────────────────────────────────────
// 型別

type Severity = 'error' | 'warn'
type Layer = 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6'

interface Finding {
  layer: Layer
  name: string
  severity: Severity
  pass: boolean
  message: string
  details?: string[] | object[]
}

// ─────────────────────────────────────────────────────────────────────────────
// 工具

type SqlResult<T> =
  | { ok: true; rows: T[] }
  | { ok: false; reason: 'skipped' | 'error'; message: string }

async function trySql<T = Record<string, unknown>>(sql: string): Promise<SqlResult<T>> {
  if (!DB_AVAILABLE) {
    return { ok: false, reason: 'skipped', message: 'DB 不通、本檢核 skip' }
  }
  try {
    const rows = await runSql<T>(sql)
    return { ok: true, rows }
  } catch (err) {
    return { ok: false, reason: 'error', message: String(err).slice(0, 200) }
  }
}

async function runSql<T = Record<string, unknown>>(sql: string): Promise<T[]> {
  if (!DB_AVAILABLE) {
    throw new Error('DB_UNAVAILABLE')
  }
  // 走 psql、輸出 JSON aggregate、parse 回 array
  // 包成 SELECT coalesce(jsonb_agg(t), '[]'::jsonb) FROM (USER_SQL) t
  const wrapped = `SELECT coalesce(jsonb_agg(t), '[]'::jsonb)::text FROM (${sql}) t`
  const res = spawnSync('psql', [SUPA_DB_URL!, '-tA', '-c', wrapped, '-v', 'ON_ERROR_STOP=1'], {
    encoding: 'utf8',
    timeout: 30000,
    env: { ...process.env, PGCONNECT_TIMEOUT: '8' },
  })
  if (res.status !== 0) {
    throw new Error(`psql 失敗：${res.stderr || res.stdout}`)
  }
  const text = (res.stdout || '').trim()
  if (!text) return []
  try {
    return JSON.parse(text) as T[]
  } catch {
    throw new Error(`psql 輸出 parse 失敗：${text.slice(0, 200)}`)
  }
}

function grepRepo(pattern: string, paths: string[] = ['src/']): string[] {
  const cmd = `grep -rnE ${JSON.stringify(pattern)} ${paths
    .map(p => `'${p}'`)
    .join(' ')} --include='*.ts' --include='*.tsx' 2>/dev/null || true`
  const out = execSync(cmd, { cwd: REPO_ROOT, encoding: 'utf8' })
  return out
    .split('\n')
    .filter(line => line.trim())
    .filter(line => !line.includes('.test.ts'))
    .filter(line => !line.includes('.spec.ts'))
}

// ─────────────────────────────────────────────────────────────────────────────
// 5 SSOT parsers（features.ts / module-tabs.ts / capabilities.ts）
//
// 5/12 channels 踩過：做了 features + capabilities + 路由 + seed 但漏 module-tabs.ts、
// HR /hr/roles 看不到 channels 可勾。本層 detector 抓這種對齊 gap。

// dashboard 個人空間、workspaces / shared_data / platform_integrations / cis 漫途專用
// 不開放給租戶 HR 管權限、不該在 module-tabs.ts 出現
const FEATURE_EXCEPTIONS_NOT_IN_MODULE_TABS = new Set([
  'dashboard',
  'workspaces',
  'shared_data_management',
  'platform_integrations',
])

// capability module 前綴的例外（不是 module-tabs.ts 列的 module）
const CAP_MODULE_EXCEPTIONS = new Set([
  'cross_branch', // 跨界 scope、非具體 module
  'cross_department',
  'workspaces', // 漫途專用、HR 不管
])

// Parser 改用 TS import、不用 regex parse、更穩
function parseFeaturesTs(): { code: string; routes: string[]; category: string }[] {
  return FEATURES.map(f => ({
    code: f.code,
    routes: [...f.routes],
    category: f.category,
  }))
}

function parseModuleCodes(): string[] {
  return MODULE_TABS_MODULES.map(m => m.code)
}

function parseCapabilityValues(): string[] {
  return Object.values(CAPABILITIES) as string[]
}

function routeToPageTsx(route: string): string {
  // /tours → src/app/(main)/tours/page.tsx
  // /tours/[code] → src/app/(main)/tours/[code]/page.tsx
  return join(REPO_ROOT, 'src/app/(main)', route, 'page.tsx')
}

function ok(layer: Layer, name: string, message: string): Finding {
  return { layer, name, severity: 'error', pass: true, message }
}

function fail(
  layer: Layer,
  name: string,
  severity: Severity,
  message: string,
  details?: string[] | object[]
): Finding {
  return { layer, name, severity, pass: false, message, details }
}

// ─────────────────────────────────────────────────────────────────────────────
// L1 — Feature Gate（workspace_features 對齊）

async function auditL1FeatureGate(): Promise<Finding[]> {
  const findings: Finding[] = []

  // L1.1: workspace_features 表有 row、且每個 workspace 都 seed 過（DB-side）
  const seedResult = await trySql<{ workspace_count: number; feature_count: number }>(`
    SELECT
      (SELECT count(*) FROM workspaces WHERE deleted_at IS NULL) AS workspace_count,
      (SELECT count(DISTINCT feature_code) FROM workspace_features) AS feature_count
  `)
  if (!seedResult.ok) {
    findings.push(fail('L1', 'feature_seed', 'warn', seedResult.message))
  } else {
    const { workspace_count, feature_count } = seedResult.rows[0] ?? {
      workspace_count: 0,
      feature_count: 0,
    }
    if (Number(workspace_count) === 0) {
      findings.push(fail('L1', 'workspace_seed', 'warn', '系統內 0 個 workspace、不應該發生', []))
    } else if (Number(feature_count) === 0) {
      findings.push(
        fail(
          'L1',
          'feature_seed',
          'error',
          `${workspace_count} 個 workspace、但 workspace_features 表 0 種 feature_code`
        )
      )
    } else {
      findings.push(
        ok(
          'L1',
          'feature_seed',
          `${workspace_count} workspace × ${feature_count} feature 全 seed 完`
        )
      )
    }
  }

  // L1.2: code 不准 hardcoded workspace.code === '漫途' 或 workspaces.type
  const hardcoded = grepRepo(`workspace\\.code\\s*===|workspaces?\\.type\\s*===`, ['src/'])
  if (hardcoded.length > 0) {
    findings.push(
      fail(
        'L1',
        'no_hardcoded_workspace',
        'error',
        `${hardcoded.length} 處 hardcoded workspace 判斷（違反平等原則 / 紅線 #0）`,
        hardcoded.slice(0, 10)
      )
    )
  } else {
    findings.push(ok('L1', 'no_hardcoded_workspace', '0 處 hardcoded workspace 判斷'))
  }

  // L1.3: modules/ 每個 module 的 routes 都有對應 page.tsx（從 SOURCE 看、不是 features.ts）
  const missingRoutes: { module: string; route: string }[] = []
  for (const m of ALL_MODULES) {
    if (m.routes.length === 0) continue // shared_data_management 等故意空 routes
    for (const route of m.routes) {
      const filePath = routeToPageTsx(route)
      if (!existsSync(filePath)) {
        missingRoutes.push({ module: m.code, route })
      }
    }
  }
  if (missingRoutes.length > 0) {
    findings.push(
      fail(
        'L1',
        'module_routes_exist',
        'warn',
        `${missingRoutes.length} 個 module route 對應 page.tsx 不存在`,
        missingRoutes
      )
    )
  } else {
    findings.push(
      ok('L1', 'module_routes_exist', `${ALL_MODULES.length} 個 module 的 routes 都存在`)
    )
  }

  // L1.5: features.ts 跟 modules/ 對齊（features.ts 是 downstream、應該從 modules 衍生）
  // 衍生來源：ALL_MODULES.code (module-level) + ALL_MODULES.subFeatures[].code (sub-feature gate)
  // codegen-permissions.ts line 75-76 已把 subFeatures 衍生進 features.ts、audit 也要跟同
  const featureCodesInTs = parseFeaturesTs().map(f => f.code)
  const moduleCodes_l1 = ALL_MODULES.map(m => m.code)
  const subFeatureCodes_l1 = ALL_MODULES.flatMap(m =>
    ((m as { subFeatures?: readonly { code: string }[] }).subFeatures ?? []).map(sf => sf.code)
  )
  const validFeatureCodes = new Set([...moduleCodes_l1, ...subFeatureCodes_l1])
  const featuresOnlyInTs = featureCodesInTs.filter(c => !validFeatureCodes.has(c))
  const modulesNotInFeaturesTs = moduleCodes_l1.filter(c => !featureCodesInTs.includes(c))
  if (featuresOnlyInTs.length > 0 || modulesNotInFeaturesTs.length > 0) {
    findings.push(
      fail(
        'L1',
        'features_ts_synced_with_modules',
        'warn',
        `features.ts 跟 modules/ drift：features.ts 多 ${featuresOnlyInTs.length} / modules/ 多 ${modulesNotInFeaturesTs.length}`,
        [
          ...featuresOnlyInTs.map(c => `features.ts 有 / modules/ 沒：${c}`),
          ...modulesNotInFeaturesTs.map(c => `modules/ 有 / features.ts 沒：${c}`),
        ]
      )
    )
  } else {
    findings.push(
      ok(
        'L1',
        'features_ts_synced_with_modules',
        `features.ts ${featureCodesInTs.length} 個跟 modules/ ${ALL_MODULES.length} 個對齊`
      )
    )
  }

  // L1.7: sidebar.tsx requiredPermission 對齊 modules/
  // 防 sidebar 寫 requiredPermission: 'channels' 但 modules/ 沒對應 module
  const sidebarReqPerms = grepRepo(`requiredPermission:\\s*['"]([a-z_]+)['"]`, [
    'src/components/layout/sidebar.tsx',
  ])
  const sidebarCodes = new Set<string>()
  for (const line of sidebarReqPerms) {
    const m = line.match(/requiredPermission:\s*['"]([a-z_]+)['"]/)
    if (m) sidebarCodes.add(m[1])
  }
  const sidebarMissing = [...sidebarCodes].filter(c => !moduleCodes_l1.includes(c))
  if (sidebarMissing.length > 0) {
    findings.push(
      fail(
        'L1',
        'sidebar_aligned_with_modules',
        'warn',
        `sidebar.tsx requiredPermission 找不到對應 module`,
        sidebarMissing
      )
    )
  } else {
    findings.push(
      ok(
        'L1',
        'sidebar_aligned_with_modules',
        `sidebar.tsx ${sidebarCodes.size} 個 requiredPermission 都對齊 modules/`
      )
    )
  }

  // L1.6: module-tabs.ts 跟 modules/ exposedToHr 對齊
  const moduleTabsCodes = new Set(parseModuleCodes())
  const exposedToHr = getHrExposedModules().map(m => m.code)
  const inModuleTabsOnly = [...moduleTabsCodes].filter(c => !exposedToHr.includes(c))
  const exposedNotInModuleTabs = exposedToHr.filter(c => !moduleTabsCodes.has(c))
  if (inModuleTabsOnly.length > 0 || exposedNotInModuleTabs.length > 0) {
    findings.push(
      fail(
        'L1',
        'module_tabs_ts_synced_with_modules',
        'warn',
        `module-tabs.ts 跟 modules/ 對齊 drift（5/12 channels 同類問題）`,
        [
          ...inModuleTabsOnly.map(c => `module-tabs.ts 有 / exposedToHr 沒：${c}`),
          ...exposedNotInModuleTabs.map(c => `exposedToHr 有 / module-tabs.ts 沒：${c}`),
        ]
      )
    )
  } else {
    findings.push(
      ok(
        'L1',
        'module_tabs_ts_synced_with_modules',
        `module-tabs.ts ${moduleTabsCodes.size} 個跟 exposedToHr modules ${exposedToHr.length} 個對齊`
      )
    )
  }

  return findings
}

// ─────────────────────────────────────────────────────────────────────────────
// L2 — Capability（role_capabilities）

async function auditL2Capability(): Promise<Finding[]> {
  const findings: Finding[] = []

  // L2.1: 廢棄的 platform.is_admin 不准再有 row（紅線 #0 phase 2）— DB-side
  const ghostResult = await trySql<{ capability_code: string; count: number }>(`
    SELECT capability_code, count(*)::int AS count
    FROM role_capabilities
    WHERE capability_code LIKE 'platform.is_admin%'
       OR capability_code LIKE '%super_admin%'
    GROUP BY capability_code
  `)
  if (!ghostResult.ok) {
    findings.push(fail('L2', 'no_ghost_capabilities', 'warn', ghostResult.message))
  } else if (ghostResult.rows.length > 0) {
    findings.push(
      fail(
        'L2',
        'no_ghost_capabilities',
        'warn',
        '殘留廢棄 capability（DB 重建時要砍）',
        ghostResult.rows
      )
    )
  } else {
    findings.push(ok('L2', 'no_ghost_capabilities', '0 條廢棄 capability'))
  }

  // L2.2: permissions 檔案 sanity（capabilities.ts + module-tabs.ts 都有內容）
  const capValues = parseCapabilityValues()
  const moduleCodes2 = parseModuleCodes()
  if (capValues.length === 0 || moduleCodes2.length === 0) {
    findings.push(
      fail(
        'L2',
        'permissions_files_present',
        'error',
        `permissions 檔案空：capabilities ${capValues.length} / module-tabs ${moduleCodes2.length}`
      )
    )
  } else {
    findings.push(
      ok(
        'L2',
        'permissions_files_present',
        `capabilities ${capValues.length} 項 / module-tabs ${moduleCodes2.length} module`
      )
    )
  }

  // L2.3: capabilities 的 module 前綴在 module-tabs 找得到
  // 例：'tours.write' → module = 'tours' 必須在 module-tabs.ts MODULES 找到
  // 例外（不在 module-tabs.ts、合理）：
  // - CAP_MODULE_EXCEPTIONS：cross_branch / cross_department（scope capability）
  // - exposedToHr=false 的 module（dashboard / customers / tour_attributes /
  //   workspaces / shared_data_management / platform_integrations）
  const moduleSet = new Set(moduleCodes2)
  const notExposedToHr = new Set(ALL_MODULES.filter(m => m.exposedToHr === false).map(m => m.code))
  const capPrefixes = new Set(capValues.map(c => c.split('.')[0]))
  const missingCapModules = [...capPrefixes].filter(
    m => !moduleSet.has(m) && !CAP_MODULE_EXCEPTIONS.has(m) && !notExposedToHr.has(m)
  )
  if (missingCapModules.length > 0) {
    findings.push(
      fail(
        'L2',
        'capability_modules_in_module_tabs',
        'warn',
        `${missingCapModules.length} 個 capability module 沒在 module-tabs.ts 定義`,
        missingCapModules
      )
    )
  } else {
    findings.push(
      ok(
        'L2',
        'capability_modules_in_module_tabs',
        `${capPrefixes.size} 個 capability module 都對齊 module-tabs`
      )
    )
  }

  // L2.5: capabilities.ts 跟 modules/ 衍生 capability codes 對齊
  // modules/ 是 source、capabilities.ts 應從 modules 衍生
  // 例外：cross_branch / cross_department 是 scope capability、不屬於任何 module
  const derivedCaps = new Set<string>()
  for (const m of ALL_MODULES) {
    for (const code of deriveCapabilityCodes(m)) {
      derivedCaps.add(code)
    }
  }
  const capInTs = new Set(capValues)
  const inTsOnly = [...capInTs]
    .filter(c => !derivedCaps.has(c))
    .filter(c => {
      const prefix = c.split('.')[0]
      return !CAP_MODULE_EXCEPTIONS.has(prefix) // 排除 cross_branch / cross_department / workspaces
    })
  const inModulesOnly = [...derivedCaps].filter(c => !capInTs.has(c))
  if (inTsOnly.length > 0 || inModulesOnly.length > 0) {
    findings.push(
      fail(
        'L2',
        'capabilities_ts_synced_with_modules',
        'warn',
        `capabilities.ts 跟 modules/ 衍生 drift：capabilities.ts 多 ${inTsOnly.length} / modules/ 多 ${inModulesOnly.length}`,
        [
          ...inTsOnly.slice(0, 5).map(c => `capabilities.ts 有 / modules 衍生沒：${c}`),
          ...inModulesOnly.slice(0, 10).map(c => `modules 衍生有 / capabilities.ts 沒：${c}`),
        ]
      )
    )
  } else {
    findings.push(
      ok(
        'L2',
        'capabilities_ts_synced_with_modules',
        `capabilities.ts ${capInTs.size} 跟 modules 衍生 ${derivedCaps.size} 完全對齊`
      )
    )
  }

  // L2.4: capabilities.ts 的 codes vs DB role_capabilities seed（雙向）
  const seedRes = await trySql<{ capability_code: string }>(`
    SELECT DISTINCT capability_code FROM role_capabilities
  `)
  if (!seedRes.ok) {
    findings.push(fail('L2', 'capabilities_seeded_in_db', 'warn', seedRes.message))
  } else {
    const dbCodes = new Set(seedRes.rows.map(r => r.capability_code))
    const codeOnlyCodes = capValues.filter(c => !dbCodes.has(c))
    const dbOnlyCodes = [...dbCodes].filter(
      c =>
        !capValues.includes(c) &&
        !c.startsWith('platform.is_admin') && // 廢棄、另檢核（L2.1）
        !c.includes('super_admin')
    )

    if (codeOnlyCodes.length > 0) {
      findings.push(
        fail(
          'L2',
          'capabilities_seeded_in_db',
          'warn',
          `${codeOnlyCodes.length} 個 capability 在 code 但 DB 沒 seed（沒人 assign）`,
          codeOnlyCodes
        )
      )
    } else {
      findings.push(
        ok('L2', 'capabilities_seeded_in_db', `${capValues.length} 個 capability 都已 seed`)
      )
    }

    if (dbOnlyCodes.length > 0) {
      findings.push(
        fail(
          'L2',
          'no_orphan_db_capabilities',
          'warn',
          `${dbOnlyCodes.length} 個 DB capability 不在 capabilities.ts（殘留 / 廢棄）`,
          dbOnlyCodes
        )
      )
    } else {
      findings.push(ok('L2', 'no_orphan_db_capabilities', '0 條 orphan capability'))
    }
  }

  return findings
}

// ─────────────────────────────────────────────────────────────────────────────
// L3 — 三維 Scope（不准散刻 sales_id=me 進 RLS）

async function auditL3Scope(): Promise<Finding[]> {
  const findings: Finding[] = []

  // L3.1: RLS policy 不准散刻 sales_id / created_by = current_user
  const sprinkled = await runSql<{
    schemaname: string
    tablename: string
    policyname: string
    cmd: string
    qual: string | null
  }>(`
    SELECT schemaname, tablename, policyname, cmd, qual
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        qual ILIKE '%sales_id%' OR
        qual ILIKE '%assigned_to%' OR
        (qual ILIKE '%created_by%' AND qual NOT ILIKE '%scope_visible%')
      )
  `)
  if (sprinkled.length > 0) {
    findings.push(
      fail(
        'L3',
        'no_sprinkled_capability',
        'warn',
        `${sprinkled.length} 條 policy 散刻 sales_id/created_by（應走 scope_visible）`,
        sprinkled
      )
    )
  } else {
    findings.push(ok('L3', 'no_sprinkled_capability', '0 條散刻 policy'))
  }

  // L3.2: 三維表存在（brands / branches / departments）
  const dim = await runSql<{ relname: string }>(`
    SELECT relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND relname IN ('brands', 'branches', 'departments')
  `)
  if (dim.length < 3) {
    const missing = ['brands', 'branches', 'departments'].filter(
      t => !dim.find(d => d.relname === t)
    )
    findings.push(fail('L3', 'three_dim_tables', 'error', `缺三維基礎表`, missing))
  } else {
    findings.push(ok('L3', 'three_dim_tables', '三維表齊全'))
  }

  return findings
}

// ─────────────────────────────────────────────────────────────────────────────
// L4 — 狀態守門

async function auditL4Editable(): Promise<Finding[]> {
  const findings: Finding[] = []

  // L4.1: is_row_editable function 存在
  const fnExists = await runSql<{ count: number }>(`
    SELECT count(*)::int AS count FROM pg_proc
    WHERE proname = 'is_row_editable'
  `)
  if ((fnExists[0]?.count ?? 0) === 0) {
    findings.push(
      fail(
        'L4',
        'is_row_editable_exists',
        'warn',
        'is_row_editable() function 不存在（之後新表加狀態守門時要建）'
      )
    )
  } else {
    findings.push(ok('L4', 'is_row_editable_exists', `is_row_editable function 存在`))
  }

  return findings
}

// ─────────────────────────────────────────────────────────────────────────────
// L5 — RLS（紅線主場、6 大檢核）

async function auditL5RLS(): Promise<Finding[]> {
  const findings: Finding[] = []

  // L5.1: workspaces 不准 FORCE（紅線 A、4/20 事故）
  const forcedWorkspaces = await runSql<{ relname: string }>(`
    SELECT relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND relname = 'workspaces' AND c.relforcerowsecurity = true
  `)
  if (forcedWorkspaces.length > 0) {
    findings.push(
      fail('L5', 'workspaces_no_force', 'error', 'workspaces 被 FORCE RLS（紅線 A、會炸登入）')
    )
  } else {
    findings.push(ok('L5', 'workspaces_no_force', 'workspaces 沒 FORCE'))
  }

  // L5.2: 所有 FORCE RLS 表清單（admin client 寫入會被擋、要確認）
  const allForce = await runSql<{ relname: string }>(`
    SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relforcerowsecurity = true
    ORDER BY c.relname
  `)
  if (allForce.length > 0) {
    findings.push(
      fail(
        'L5',
        'force_rls_audit',
        'warn',
        `${allForce.length} 張 FORCE RLS 表（確認 admin client 寫入有對應 policy）`,
        allForce
      )
    )
  } else {
    findings.push(ok('L5', 'force_rls_audit', '0 張 FORCE RLS 表'))
  }

  // L5.3: 有 workspace_id 欄位的 table 必 ENABLE RLS
  const wsScopedNoRls = await runSql<{ table_name: string }>(`
    SELECT c.relname AS table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relrowsecurity = false
      AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = c.relname
          AND column_name = 'workspace_id'
      )
    ORDER BY c.relname
  `)
  if (wsScopedNoRls.length > 0) {
    findings.push(
      fail(
        'L5',
        'workspace_scoped_must_enable_rls',
        'error',
        `${wsScopedNoRls.length} 張有 workspace_id 但 RLS 沒開（資料庫紅線）`,
        wsScopedNoRls
      )
    )
  } else {
    findings.push(ok('L5', 'workspace_scoped_must_enable_rls', '所有 workspace 表 RLS 都開'))
  }

  // L5.4: ENABLE RLS 但 0 policy（全擋、可能漏寫）
  const zeroPolicy = await runSql<{ table_name: string }>(`
    SELECT c.relname AS table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relrowsecurity = true
      AND NOT EXISTS (
        SELECT 1 FROM pg_policies p
        WHERE p.schemaname = 'public' AND p.tablename = c.relname
      )
    ORDER BY c.relname
  `)
  if (zeroPolicy.length > 0) {
    findings.push(
      fail(
        'L5',
        'zero_policy_tables',
        'warn',
        `${zeroPolicy.length} 張 RLS ON 但 0 policy（admin only / 漏寫）`,
        zeroPolicy
      )
    )
  } else {
    findings.push(ok('L5', 'zero_policy_tables', '0 張零 policy 表'))
  }

  // L5.5: policy 寫 OR workspace_id IS NULL（全人看到、紅線）
  const nullLeak = await runSql<{
    tablename: string
    policyname: string
    qual: string | null
  }>(`
    SELECT tablename, policyname, qual
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (qual ILIKE '%workspace_id IS NULL%' OR with_check ILIKE '%workspace_id IS NULL%')
  `)
  if (nullLeak.length > 0) {
    findings.push(
      fail(
        'L5',
        'no_null_workspace_leak',
        'error',
        `${nullLeak.length} 條 policy 寫 OR workspace_id IS NULL（資料外洩風險）`,
        nullLeak
      )
    )
  } else {
    findings.push(ok('L5', 'no_null_workspace_leak', '0 條 NULL workspace leak'))
  }

  // L5.6: helper procedures 存在（5/13 抽象層）
  const procExists = await runSql<{ proname: string }>(`
    SELECT proname FROM pg_proc
    WHERE proname IN ('setup_workspace_scoped_rls', 'setup_join_table_rls', 'setup_inherited_rls')
  `)
  if (procExists.length < 3) {
    const missing = [
      'setup_workspace_scoped_rls',
      'setup_join_table_rls',
      'setup_inherited_rls',
    ].filter(p => !procExists.find(e => e.proname === p))
    findings.push(fail('L5', 'rls_helpers_present', 'error', `缺 RLS helper procedure`, missing))
  } else {
    findings.push(ok('L5', 'rls_helpers_present', '3 個 RLS helper procedure 齊全'))
  }

  // L5.7: 有 workspace_id 的 table 必有 (workspace_id, ...) index
  const noWsIndex = await runSql<{ table_name: string }>(`
    SELECT t.tablename AS table_name
    FROM pg_tables t
    WHERE t.schemaname = 'public'
      AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = t.tablename
          AND column_name = 'workspace_id'
      )
      AND NOT EXISTS (
        SELECT 1 FROM pg_indexes i
        WHERE i.schemaname = 'public'
          AND i.tablename = t.tablename
          AND i.indexdef ILIKE '%(workspace_id%'
      )
    ORDER BY t.tablename
  `)
  if (noWsIndex.length > 0) {
    findings.push(
      fail(
        'L5',
        'workspace_id_index',
        'warn',
        `${noWsIndex.length} 張表有 workspace_id 但無對應 index（RLS 過濾慢）`,
        noWsIndex
      )
    )
  } else {
    findings.push(ok('L5', 'workspace_id_index', '所有 workspace 表都有 index'))
  }

  return findings
}

// ─────────────────────────────────────────────────────────────────────────────
// L6 — 防呆 / SSOT（中央 module）

async function auditL6CentralModule(): Promise<Finding[]> {
  const findings: Finding[] = []

  // L6.1: 中央 module 檔案存在
  const centralFiles = ['src/lib/codes.ts', 'src/lib/db-error-translate.ts']
  const missing: string[] = []
  for (const f of centralFiles) {
    try {
      execSync(`test -f ${JSON.stringify(f)}`, { cwd: REPO_ROOT })
    } catch {
      missing.push(f)
    }
  }
  if (missing.length > 0) {
    findings.push(fail('L6', 'central_modules_exist', 'error', '缺中央 module', missing))
  } else {
    findings.push(ok('L6', 'central_modules_exist', `${centralFiles.length} 個中央 module 都在`))
  }

  // L6.2: 不准 inline supabase.rpc('generate_xxx_code')（應走 @/lib/codes）
  const inlineRpc = grepRepo(`supabase\\.rpc\\(['"]generate_[a-z_]+_code`, ['src/']).filter(
    line => !line.includes('src/lib/codes.ts')
  )
  if (inlineRpc.length > 0) {
    findings.push(
      fail(
        'L6',
        'no_inline_code_rpc',
        'error',
        `${inlineRpc.length} 處 inline supabase.rpc('generate_xxx_code')（應走 @/lib/codes）`,
        inlineRpc.slice(0, 10)
      )
    )
  } else {
    findings.push(ok('L6', 'no_inline_code_rpc', '0 處 inline 編號 RPC'))
  }

  // L6.3: API route 不准 return error.message（應走 dbErrorResponse）
  // 抓 src/app/api/ 直接 return err / error.message
  const rawErrorReturn = grepRepo(
    `(NextResponse\\.json|Response\\.json|return\\s+Response).*error.message`,
    ['src/app/api/']
  )
  if (rawErrorReturn.length > 0) {
    findings.push(
      fail(
        'L6',
        'no_raw_error_message',
        'warn',
        `${rawErrorReturn.length} 處 API return error.message（應走 dbErrorResponse）`,
        rawErrorReturn.slice(0, 10)
      )
    )
  } else {
    findings.push(ok('L6', 'no_raw_error_message', '0 處 raw error.message return'))
  }

  // L6.4: created_by FK 必指 employees(id)（紅線 B）— DB-side、Mac 本地會 skip
  const fkResult = await trySql<{
    table_name: string
    column_name: string
    foreign_table: string
  }>(`
    SELECT
      tc.table_name,
      kcu.column_name,
      ccu.table_schema || '.' || ccu.table_name AS foreign_table
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
     AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
     AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND kcu.column_name IN (
        'created_by','updated_by','performed_by','uploaded_by',
        'locked_by','last_unlocked_by','deleted_by'
      )
      AND (ccu.table_schema != 'public' OR ccu.table_name != 'employees')
    ORDER BY tc.table_name, kcu.column_name
  `)
  if (!fkResult.ok) {
    findings.push(fail('L6', 'audit_fk_employees', 'warn', fkResult.message))
  } else if (fkResult.rows.length > 0) {
    findings.push(
      fail(
        'L6',
        'audit_fk_employees',
        'error',
        `${fkResult.rows.length} 條審計欄位 FK 沒指 employees(id)（紅線 B）`,
        fkResult.rows
      )
    )
  } else {
    findings.push(ok('L6', 'audit_fk_employees', '審計欄位 FK 全指 employees'))
  }

  // L6.5: created_by 寫 || '' 空字串（紅線、會炸）
  const emptyFk = grepRepo(`created_by\\s*:\\s*[^,\\n]*\\|\\|\\s*['"]['"]`, ['src/'])
  if (emptyFk.length > 0) {
    findings.push(
      fail(
        'L6',
        'no_empty_string_fk',
        'error',
        `${emptyFk.length} 處 created_by: x || ''（紅線、應為 || undefined）`,
        emptyFk.slice(0, 10)
      )
    )
  } else {
    findings.push(ok('L6', 'no_empty_string_fk', "0 處 || '' 空字串 FK"))
  }

  // L6.6: as any / : any 不准（CLAUDE.md 紅線）
  // 走 npm run audit:any-usage 比較準、這裡只快速 sanity check
  const asAnyHits = grepRepo(`\\bas\\s+any\\b`, ['src/']).length
  if (asAnyHits > 30) {
    findings.push(
      fail(
        'L6',
        'no_as_any_explosion',
        'warn',
        `${asAnyHits} 處 'as any'（建議 npm run audit:any-usage 詳查）`
      )
    )
  } else {
    findings.push(ok('L6', 'no_as_any_explosion', `as any 控制在 ${asAnyHits} 處`))
  }

  // L6.7: 砍欄位 caller 0 reference check（5/13 加、防 A1 orders.code 同類 bug 再發）
  // 維護「已砍欄位清單」、CI 跑檢查 0 caller 還用
  // 砍新欄位時、加進 DELETED_COLUMNS、CI 自動守
  const DELETED_COLUMNS = [
    {
      table: 'orders',
      column: 'code',
      reason: 'A1（5/13 拍板）：order_number 為 SSOT',
    },
    {
      table: 'personal_info',
      column: 'email',
      reason: 'A2（5/13 拍板）：employees.email 為 SSOT',
    },
    {
      table: 'suppliers',
      column: 'category_id',
      reason: '5/13 dev 發現 DB 已砍、caller 漏改',
    },
  ] as const

  const deletedColumnRefs: { table: string; column: string; ref: string }[] = []
  for (const { table, column } of DELETED_COLUMNS) {
    // Pattern: 找含 column 的 SELECT 字串、INSERT/UPDATE object field、TS field access
    // 用 -B 5 抓上下文、再 line 內 filter 是否在該 table 的 from() 附近
    // grep 限制（single-line）：用兩階段抓
    // 1. 先抓「該 table 出現 + 同檔內 column 出現」、再人工 review
    const fromHits = grepRepo(`from\\(['"]${table}['"]`, ['src/'])
    const filesWithFrom = new Set(fromHits.map(l => l.split(':')[0]))

    // 對每個用該 table 的檔、grep column reference
    for (const file of filesWithFrom) {
      const colRefs = grepRepo(`(?:[,'"\\s]|^)${column}(?:[,'"\\s:]|$)`, [file])
      // 讀檔內容供 context 檢查
      const fileLines = readFileSync(join(REPO_ROOT, file), 'utf8').split('\n')
      for (const ref of colRefs) {
        // 排除 import / type 定義 / 註解 / property access（t.code、tour.code 不是 orders.code）
        const lineContent = ref.split(':').slice(2).join(':')
        if (
          /^\s*\/\//.test(lineContent) ||
          /^\s*\*/.test(lineContent) ||
          /interface |type \w+ =/.test(lineContent) ||
          new RegExp(`\\w+\\.${column}`).test(lineContent) // x.code = property access，不是 orders.code
        ) {
          continue
        }
        // 確認 column 的 .select() 是在 from(table) 的 chain 裡、不是別的 table
        // 往上找最近的 .from(...) call（在 10 行內）
        const lineNum = parseInt(ref.split(':')[1], 10) - 1
        let nearestFrom = ''
        for (let i = lineNum; i >= Math.max(0, lineNum - 10); i--) {
          const fromMatch = fileLines[i]?.match(/\.from\(['"]([\w_]+)['"]\)/)
          if (fromMatch) {
            nearestFrom = fromMatch[1]
            break
          }
        }
        // 如果最近的 from() 不是目標 table，這是 false positive，skip
        if (nearestFrom && nearestFrom !== table) continue

        deletedColumnRefs.push({ table, column, ref: ref.slice(0, 200) })
      }
    }
  }

  // L6.7b（2026-05-13 黒羽加）：entity hook caller object literal 含已砍欄位
  // A1 orders.code 漏 7 → 8 處、第 8 處 createOrder({code,...}) 不經 .from('orders')、L6.7 漏抓
  // 補：對每個 DELETED_COLUMN、找 src/data/entities/<table>.ts 的 export caller names、
  //     用 multi-line regex 掃 caller({...column...}) pattern
  for (const { table, column } of DELETED_COLUMNS) {
    const entityFile = join(REPO_ROOT, `src/data/entities/${table}.ts`)
    if (!existsSync(entityFile)) continue

    const entitySrc = readFileSync(entityFile, 'utf8')
    const callerMatches = Array.from(
      entitySrc.matchAll(/export const ((?:create|update|delete)\w+)\s*=/g)
    )
    const callerNames = callerMatches.map(m => m[1])
    if (callerNames.length === 0) continue

    // 拿全 src/ TS 檔案
    const tsFiles = execSync(
      `find src -type f \\( -name '*.ts' -o -name '*.tsx' \\) ! -name '*.test.ts' ! -name '*.spec.ts'`,
      { cwd: REPO_ROOT, encoding: 'utf8' }
    )
      .split('\n')
      .filter(Boolean)

    for (const file of tsFiles) {
      const src = readFileSync(join(REPO_ROOT, file), 'utf8')
      for (const caller of callerNames) {
        // 多行 regex：caller(\s*{...column[:,]...})
        // 限制 800 字避免 catastrophic backtracking
        const re = new RegExp(`${caller}\\(\\s*\\{[^}]{0,800}\\b${column}\\b\\s*[:,]`, 'g')
        let m: RegExpExecArray | null
        while ((m = re.exec(src)) !== null) {
          const lineNum = src.substring(0, m.index).split('\n').length
          deletedColumnRefs.push({
            table,
            column,
            ref: `${file}:${lineNum} ${caller}({...${column}...})`,
          })
        }
      }
    }
  }

  if (deletedColumnRefs.length > 0) {
    findings.push(
      fail(
        'L6',
        'no_deleted_column_refs',
        'error',
        `${deletedColumnRefs.length} 處 caller 還用已砍欄位（會炸 42703 undefined_column）`,
        deletedColumnRefs.map(r => `${r.table}.${r.column}: ${r.ref.slice(0, 120)}`)
      )
    )
  } else {
    findings.push(
      ok('L6', 'no_deleted_column_refs', `${DELETED_COLUMNS.length} 個已砍欄位 0 caller 殘留`)
    )
  }

  // L6.8：entity hook SELECT vs DB schema 自動 diff（5/13 W 拍板加、防同類 bug 再發）
  // 邏輯：fetch DB schema → grep 所有 entity hook → 對每個 SELECT 字串比對 → 列 drift
  // 涵蓋：createEntityHook + createCloudHook 兩個系統
  const schemaResult = await trySql<{ table_name: string; columns: string }>(`
    SELECT table_name, string_agg(column_name, ',') AS columns
    FROM information_schema.columns
    WHERE table_schema = 'public'
    GROUP BY table_name
  `)

  if (!schemaResult.ok) {
    findings.push(fail('L6', 'entity_hook_schema_drift', 'warn', schemaResult.message))
  } else {
    const schemaMap = new Map<string, Set<string>>(
      schemaResult.rows.map(r => [r.table_name, new Set(r.columns.split(','))])
    )

    // 抓所有 createEntityHook / createCloudHook 用法
    const hookGrep = grepRepo(`(createEntityHook|createCloudHook)<[^>]+>\\(`, [
      'src/data/entities/',
      'src/hooks/',
    ])

    const driftFindings: { hook: string; table: string; missing: string[] }[] = []
    for (const grepLine of hookGrep) {
      const m = grepLine.match(
        /^([^:]+):(\d+):.*?(createEntityHook|createCloudHook)<[^>]+>\(['"]([a-z_]+)['"]/
      )
      if (!m) continue
      const [, file, lineNum, , tableName] = m
      const dbCols = schemaMap.get(tableName)
      if (!dbCols) continue // table 不存在 DB、不在此 detector 範圍

      // Read file 前後 80 行、抓 select 字串
      try {
        const fileContent = readFileSync(file, 'utf8')
        const startLine = Math.max(0, parseInt(lineNum) - 5)
        const endLine = Math.min(fileContent.split('\n').length, parseInt(lineNum) + 80)
        const block = fileContent.split('\n').slice(startLine, endLine).join('\n')

        // 抓 select: '...' 跟 select: `...`
        const selectStrs: string[] = []
        const re1 = /select:\s*'([^']+)'/g
        const re2 = /select:\s*`([^`]+)`/g
        let m2: RegExpExecArray | null
        while ((m2 = re1.exec(block)) !== null) selectStrs.push(m2[1])
        while ((m2 = re2.exec(block)) !== null) selectStrs.push(m2[1])

        // 抓 const X_FIELDS = [...].join(',')（同檔內）
        const constRe =
          /const\s+[A-Z_]+_(?:LIST_)?(?:SELECT_)?FIELDS\s*=\s*\[([^\]]+)\]\.join\(',?'?\)/g
        while ((m2 = constRe.exec(fileContent)) !== null) {
          const arrStr = m2[1]
          const cols = [...arrStr.matchAll(/'([^']+)'/g)].map(mm => mm[1])
          if (cols.length > 0) selectStrs.push(cols.join(','))
        }

        for (const sel of selectStrs) {
          const cols = sel
            .split(',')
            .map(c => c.trim().split('(')[0].split(':')[0].trim())
            .filter(c => c && !c.startsWith('!') && /^[a-z_]+$/.test(c))
          const missing = cols.filter(c => !dbCols.has(c))
          if (missing.length > 0) {
            driftFindings.push({ hook: `${file}:${lineNum}`, table: tableName, missing })
          }
        }
      } catch {
        // skip unreadable file
      }
    }

    if (driftFindings.length > 0) {
      findings.push(
        fail(
          'L6',
          'entity_hook_schema_drift',
          'error',
          `${driftFindings.length} 個 entity hook SELECT 內含 DB 不存在的欄位（會炸 42703）`,
          driftFindings.map(d => `${d.table} @ ${d.hook}: ${d.missing.join(', ')}`)
        )
      )
    } else {
      findings.push(
        ok(
          'L6',
          'entity_hook_schema_drift',
          `${hookGrep.length} 個 entity hook SELECT 跟 DB schema 0 drift`
        )
      )
    }
  }

  return findings
}

// ─────────────────────────────────────────────────────────────────────────────
// Runner

const AUDITS: Record<Layer, () => Promise<Finding[]>> = {
  L1: auditL1FeatureGate,
  L2: auditL2Capability,
  L3: auditL3Scope,
  L4: auditL4Editable,
  L5: auditL5RLS,
  L6: auditL6CentralModule,
}

async function main() {
  const layersToRun: Layer[] =
    flags.layer === 'ALL'
      ? (['L1', 'L2', 'L3', 'L4', 'L5', 'L6'] as Layer[])
      : ([flags.layer] as Layer[])

  const allFindings: Finding[] = []
  for (const layer of layersToRun) {
    const fn = AUDITS[layer]
    if (!fn) {
      console.error(`❌ 未知 layer: ${layer}`)
      process.exit(2)
    }
    try {
      const found = await fn()
      allFindings.push(...found)
    } catch (err) {
      const msg = String(err)
      if (msg.includes('DB_UNAVAILABLE')) {
        // DB 不通是「環境問題」、不是紅線違反、降為 warn
        allFindings.push(
          fail(
            layer,
            `${layer}_db_skipped`,
            'warn',
            'DB 不通、本層 DB 檢核 skip（CI 環境應該能連）'
          )
        )
      } else {
        console.error(`❌ ${layer} audit 出錯：`, err)
        allFindings.push(fail(layer, `${layer}_runtime_error`, 'error', msg))
      }
    }
  }

  if (flags.format === 'markdown') {
    printMarkdown(allFindings)
  } else {
    printConsole(allFindings)
  }

  const errorFails = allFindings.filter(f => !f.pass && f.severity === 'error')
  const warnFails = allFindings.filter(f => !f.pass && f.severity === 'warn')

  console.log('')
  console.log(
    `總計：${allFindings.length} 項 / 通過 ${allFindings.filter(f => f.pass).length} / error ${errorFails.length} / warn ${warnFails.length}`
  )

  if (errorFails.length > 0 && !flags.warnOnly) {
    console.log('❌ 有紅線違反、CI 擋 merge。修完再 push。')
    process.exit(1)
  }
  if (errorFails.length > 0 && flags.warnOnly) {
    console.log('⚠️  有紅線違反、但 --warn-only 不擋。')
  }
  console.log('✅ blueprint 6 層全綠（或只剩 warning）。')
  process.exit(0)
}

function printConsole(findings: Finding[]) {
  const byLayer = new Map<Layer, Finding[]>()
  for (const f of findings) {
    if (!byLayer.has(f.layer)) byLayer.set(f.layer, [])
    byLayer.get(f.layer)!.push(f)
  }

  const layerNames: Record<Layer, string> = {
    L1: 'Feature Gate',
    L2: 'Capability',
    L3: '三維 Org Scope',
    L4: '狀態守門',
    L5: 'RLS',
    L6: '防呆 SSOT',
  }

  for (const layer of ['L1', 'L2', 'L3', 'L4', 'L5', 'L6'] as Layer[]) {
    const items = byLayer.get(layer) ?? []
    if (items.length === 0) continue
    console.log('')
    console.log(`━━ ${layer} — ${layerNames[layer]} ━━`)
    for (const f of items) {
      const icon = f.pass ? '✓' : f.severity === 'error' ? '✗' : '⚠'
      console.log(`  ${icon} ${f.name}: ${f.message}`)
      if (!f.pass && f.details) {
        const detailLines =
          Array.isArray(f.details) && typeof f.details[0] === 'string'
            ? (f.details as string[])
            : (f.details as object[]).map(d => JSON.stringify(d))
        for (const line of detailLines.slice(0, 8)) {
          console.log(`      ${line}`)
        }
        if (detailLines.length > 8) {
          console.log(`      ... 還有 ${detailLines.length - 8} 條`)
        }
      }
    }
  }
}

function printMarkdown(findings: Finding[]) {
  console.log('# RLS Blueprint Audit Report')
  console.log('')
  console.log(`產生時間：${new Date().toISOString()}`)
  console.log('')
  console.log('| Layer | Check | Severity | Status | Message |')
  console.log('|---|---|---|---|---|')
  for (const f of findings) {
    const status = f.pass ? '✅' : f.severity === 'error' ? '❌' : '⚠️'
    console.log(`| ${f.layer} | ${f.name} | ${f.severity} | ${status} | ${f.message} |`)
  }
}

main().catch(err => {
  console.error('❌ audit script 崩掉：', err)
  process.exit(2)
})
