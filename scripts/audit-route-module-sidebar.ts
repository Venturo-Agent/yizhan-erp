#!/usr/bin/env tsx
/**
 * audit-route-module-sidebar.ts — sidebar ↔ (main) 實體路由 ↔ module.routes 三套真相對齊
 *
 * 用法：
 *   npm run audit:route-sidebar              # 全跑、有漂移 exit 1
 *   npm run audit:route-sidebar -- --warn    # 不擋 CI、只列 warning
 *
 * 校驗三件事（B6 範圍）：
 *   1. SIDEBAR_ORDER 內每個 module code 都有 ALL_MODULES 對應 SOURCE
 *   2. SIDEBAR_META[code].href + children[].href 都能對應到 (main) 實體目錄
 *   3. (main) 實體目錄 ↔ module.routes ↔ sidebar href 三者一致
 *      - 孤兒目錄：(main) 有檔、但沒任何 module.routes 或 sidebar href 指向 → 漂移
 *      - 孤兒 module.routes：module 宣告 routes 但 (main) 找不到實體 → 漂移
 *      - 孤兒 sidebar href：sidebar 列出 href 但實體不存在 → 漂移
 *
 * 用意：避免「sidebar 出現的選項點下去 404」「實體目錄存在但沒人能進」這類爛尾路由。
 *
 * 2026-05-29 William 拍板砍 bot/messaging/office 後新增。
 */

import { readdirSync, existsSync, statSync } from 'node:fs'
import { dirname, resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ALL_MODULES } from '../src/modules/_registry'
import { SIDEBAR_ORDER, SIDEBAR_META } from '../src/components/layout/sidebar-config'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '..')
const MAIN_DIR = resolve(REPO_ROOT, 'src/app/(main)')

const args = new Set(process.argv.slice(2))
const WARN_ONLY = args.has('--warn') || args.has('--warn-only')

interface Finding {
  severity: 'error' | 'warn'
  category: string
  message: string
}

const findings: Finding[] = []

// ─────────────────────────────────────────────────────────────────────────────
// Helper: 把 (main) 實體子目錄列出來（只取一層 + 子層、用於 startsWith 比對）

/**
 * 遞迴掃出 (main) 下所有「有 page.tsx」的目錄、回傳對應 URL 路徑（不含 (main)）。
 * 譬如 src/app/(main)/finance/page.tsx → '/finance'
 *      src/app/(main)/finance/payments/page.tsx → '/finance/payments'
 *      src/app/(main)/tours/[code]/page.tsx → '/tours/[code]'
 */
function listMainPageRoutes(): string[] {
  const out: string[] = []
  function walk(dir: string, urlPrefix: string) {
    if (!existsSync(dir)) return
    const entries = readdirSync(dir, { withFileTypes: true })
    // 該層有 page.tsx → 該 URL 是路由
    if (entries.some(e => e.isFile() && /^page\.(tsx|jsx|ts|js)$/.test(e.name))) {
      out.push(urlPrefix || '/')
    }
    for (const e of entries) {
      if (!e.isDirectory()) continue
      // 跳過 _components / _hooks 之類私有目錄
      if (e.name.startsWith('_')) continue
      // 跳過 (group) 命名路由群、URL 不含群名
      const segment = e.name.startsWith('(') && e.name.endsWith(')') ? '' : `/${e.name}`
      walk(join(dir, e.name), urlPrefix + segment)
    }
  }
  walk(MAIN_DIR, '')
  return out
}

/**
 * 把 Next.js 動態路由 [param] 標準化成 placeholder
 */
function normalize(route: string): string {
  return route.replace(/\/\[[^/]+\]/g, '/[param]')
}

/**
 * route 是否屬於 module.routes 任一條（startsWith 對齊）
 */
function routeMatchesModule(route: string, moduleRoutes: readonly string[]): boolean {
  const r = normalize(route)
  return moduleRoutes.some(mr => {
    const m = normalize(mr)
    return r === m || r.startsWith(m + '/') || m === r.replace(/\/\[param\].*$/, '')
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. SIDEBAR_ORDER 每個 code 都有 ALL_MODULES 對應

function checkSidebarOrderModulesExist() {
  const moduleCodes = new Set(ALL_MODULES.map(m => m.code))
  for (const code of SIDEBAR_ORDER) {
    if (!moduleCodes.has(code)) {
      findings.push({
        severity: 'error',
        category: 'sidebar-order-orphan',
        message: `SIDEBAR_ORDER 列了 '${code}' 但 src/modules/${code}.ts 不存在（_registry.ts 未 register）`,
      })
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. SIDEBAR_META href / children[].href 都對應到實體 (main) 目錄

function checkSidebarHrefsHaveRoutes(mainRoutes: string[]) {
  const mainSet = new Set(mainRoutes.map(normalize))

  for (const code of SIDEBAR_ORDER) {
    const meta = SIDEBAR_META[code]
    if (!meta) continue
    if (meta.hidden) continue

    // 主 entry href（未指定 = 用 module.routes[0]）
    const mod = ALL_MODULES.find(m => m.code === code)
    const mainHref = meta.href ?? mod?.routes[0]
    if (mainHref) {
      const norm = normalize(mainHref)
      // 容許 startsWith match：sidebar href 可能比實體粗（譬如 /finance）
      const hit = [...mainSet].some(r => r === norm || r.startsWith(norm + '/'))
      if (!hit) {
        findings.push({
          severity: 'error',
          category: 'sidebar-href-orphan',
          message: `Sidebar '${code}' 主 href '${mainHref}' 在 (main) 找不到對應實體路由（404 風險）`,
        })
      }
    }

    // children href
    for (const child of meta.children ?? []) {
      const norm = normalize(child.href)
      const hit = [...mainSet].some(r => r === norm || r.startsWith(norm + '/'))
      if (!hit) {
        findings.push({
          severity: 'error',
          category: 'sidebar-child-href-orphan',
          message: `Sidebar '${code}' 子選項 '${child.label}' href '${child.href}' 在 (main) 找不到對應實體路由（404 風險）`,
        })
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. module.routes 都對應到實體 (main) 目錄

function checkModuleRoutesHaveImpl(mainRoutes: string[]) {
  const mainSet = new Set(mainRoutes.map(normalize))

  for (const mod of ALL_MODULES) {
    for (const route of mod.routes) {
      const norm = normalize(route)
      const hit = [...mainSet].some(r => r === norm || r.startsWith(norm + '/'))
      if (!hit) {
        findings.push({
          severity: 'warn',
          category: 'module-route-orphan',
          message: `Module '${mod.code}' 宣告 routes 含 '${route}'、但 (main) 找不到對應實體路由（可能是 API 限定或 hidden、確認是否該砍）`,
        })
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. (main) 實體目錄都有 module.routes 或 sidebar 對應（孤兒目錄）

function checkMainDirsCovered(mainRoutes: string[]) {
  // 收集 module + sidebar 所有「宣告的路由」
  const declared = new Set<string>()
  for (const mod of ALL_MODULES) {
    for (const r of mod.routes) declared.add(normalize(r))
  }
  for (const code of SIDEBAR_ORDER) {
    const meta = SIDEBAR_META[code]
    if (!meta) continue
    if (meta.href) declared.add(normalize(meta.href))
    for (const child of meta.children ?? []) declared.add(normalize(child.href))
  }

  // (main) 永遠放行 / 公用路由（ModuleGuard 不檢、不算孤兒）
  const ALWAYS_ALLOWED = new Set(['/', '/dashboard', '/login', '/no-access'])

  for (const route of mainRoutes) {
    const norm = normalize(route)
    if (ALWAYS_ALLOWED.has(norm)) continue
    // 任一 declared 是這個 route 的 prefix → 算被涵蓋
    const covered = [...declared].some(d => norm === d || norm.startsWith(d + '/'))
    if (!covered) {
      findings.push({
        severity: 'warn',
        category: 'main-dir-orphan',
        message: `(main) 實體路由 '${route}' 無 module.routes 也無 sidebar 對應（可能是孤兒目錄、或漏 register）`,
      })
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 跑

function main() {
  const mainRoutes = listMainPageRoutes()
  console.log(`[info] 掃出 (main) 實體路由 ${mainRoutes.length} 條`)
  console.log(`[info] SIDEBAR_ORDER ${SIDEBAR_ORDER.length} 項`)
  console.log(`[info] ALL_MODULES ${ALL_MODULES.length} 個`)
  console.log('')

  checkSidebarOrderModulesExist()
  checkSidebarHrefsHaveRoutes(mainRoutes)
  checkModuleRoutesHaveImpl(mainRoutes)
  checkMainDirsCovered(mainRoutes)

  // 分類列出
  const errors = findings.filter(f => f.severity === 'error')
  const warns = findings.filter(f => f.severity === 'warn')

  if (errors.length > 0) {
    console.log('═══ ERRORS（紅線、會擋 CI） ═══')
    for (const f of errors) {
      console.log(`  [${f.category}] ${f.message}`)
    }
    console.log('')
  }
  if (warns.length > 0) {
    console.log('═══ WARNINGS（建議審視） ═══')
    for (const f of warns) {
      console.log(`  [${f.category}] ${f.message}`)
    }
    console.log('')
  }

  if (errors.length === 0 && warns.length === 0) {
    console.log('✓ 三套真相一致、無漂移')
    process.exit(0)
  }

  console.log(`總結：${errors.length} error / ${warns.length} warn`)
  if (errors.length > 0 && !WARN_ONLY) {
    process.exit(1)
  }
  process.exit(0)
}

main()
