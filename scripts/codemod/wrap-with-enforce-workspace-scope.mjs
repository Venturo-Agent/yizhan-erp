#!/usr/bin/env node
/**
 * Codemod helper：把既有 supabase.from(...) call 包成 enforceWorkspaceScope(...)
 *
 *
 * 用法：
 *   node scripts/codemod/wrap-with-enforce-workspace-scope.mjs <glob>
 *   node scripts/codemod/wrap-with-enforce-workspace-scope.mjs "src/features/tours/**\/*.ts"
 *   node scripts/codemod/wrap-with-enforce-workspace-scope.mjs "src/features/tours/**" --filter hooks
 *   node scripts/codemod/wrap-with-enforce-workspace-scope.mjs "src/features/tours/**" --apply  # 危險、要 confirm
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 為什麼是「半自動 helper」、不是真 codemod
 *
 * 1. supabase query chain 跨多行常見、AST 才能準確定位
 *    例：
 *      const { data } = await supabase
 *        .from('orders')
 *        .select('id, code')
 *        .eq('status', 'active')
 *        .order('created_at')
 *
 *    純 regex 接不到多行、改錯會破壞 query
 *
 * 2. workspaceId 從哪拿、看上下文：
 *    - hook → ctx?.workspaceId / currentWorkspace?.id
 *    - API route → req.workspaceId / await getWorkspaceContext(req)
 *    - service 層 → 從參數收
 *    機器決定不了、開發者要看現場
 *
 * 3. 公用主檔（cities / countries / currencies）不該包、要 opt-out
 *    機器分不出哪些是公用主檔、會誤包
 *
 * 4. .single() / .maybeSingle() 要從 query 內部移到 enforceWorkspaceScope(...) 之外
 *    這個轉換 regex 做不準
 *
 * 所以本工具：
 *   - 預設 dry-run / list-only
 *   - 列出 file:line + 原始 + 建議改寫範本
 *   - 開發者 copy-paste、自己決定 workspaceId 從哪拿
 *   - --apply 模式只處理「單行、簡單」的 case、且要互動確認
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs'
import { join, relative, dirname, resolve, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createInterface } from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '../..')

// ─────────────────────────────────────────────────────────────────────────────
// CLI

const args = process.argv.slice(2)
if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  console.log(`
Codemod helper：把 supabase.from(...) 包成 enforceWorkspaceScope(...)

用法：
  node scripts/codemod/wrap-with-enforce-workspace-scope.mjs <glob>

選項：
  --filter <substring>   只處理 path 含此字串的 file
  --apply                實際改檔（要互動確認、僅處理單行 case）
  --skip-auth            跳過 src/lib/auth/* 等 helper 本身
  -h, --help             顯示本說明

範例：
  node scripts/codemod/wrap-with-enforce-workspace-scope.mjs "src/features/tours/**"
  node scripts/codemod/wrap-with-enforce-workspace-scope.mjs "src/features/orders/**" --filter hooks
`)
  process.exit(0)
}

const glob = args.find((a) => !a.startsWith('--'))
const filterIdx = args.indexOf('--filter')
const filter = filterIdx >= 0 ? args[filterIdx + 1] : null
const apply = args.includes('--apply')
const skipAuth = args.includes('--skip-auth') || true // 預設開、helper 本身不該被改

if (!glob) {
  console.error('錯誤：缺 glob 參數。試 --help')
  process.exit(1)
}

// ─────────────────────────────────────────────────────────────────────────────
// glob expand（簡易實作、只支援 ** 跟 *）

/**
 * 把 glob 拆成 baseDir + pattern
 *   "src/features/tours/**\/*.ts" → { base: "src/features/tours", pattern: ".ts" }
 *   "src/features/tours/**" → { base: "src/features/tours", pattern: null }
 */
function parseGlob(g) {
  // 砍掉結尾 quote
  const cleaned = g.replace(/^['"]|['"]$/g, '')
  const starIdx = cleaned.indexOf('*')
  if (starIdx === -1) {
    return { base: cleaned, pattern: null }
  }
  const baseEnd = cleaned.lastIndexOf('/', starIdx)
  const base = baseEnd === -1 ? '.' : cleaned.slice(0, baseEnd)
  const tail = cleaned.slice(baseEnd + 1)
  // 抓 extension hint
  const extMatch = tail.match(/\*\.(tsx|ts|jsx|js)$/)
  const ext = extMatch ? `.${extMatch[1]}` : null
  return { base, pattern: ext }
}

function walk(dir, fileList = []) {
  let entries
  try {
    entries = readdirSync(dir)
  } catch {
    return fileList
  }
  for (const entry of entries) {
    const full = join(dir, entry)
    let st
    try {
      st = statSync(full)
    } catch {
      continue
    }
    if (st.isDirectory()) {
      if (entry === 'node_modules' || entry === '.next' || entry === 'dist' || entry.startsWith('.')) {
        continue
      }
      walk(full, fileList)
    } else if (st.isFile()) {
      const ext = extname(entry)
      if (ext === '.ts' || ext === '.tsx') {
        fileList.push(full)
      }
    }
  }
  return fileList
}

const { base, pattern } = parseGlob(glob)
const baseAbs = resolve(REPO_ROOT, base)
let files = walk(baseAbs)

if (pattern) {
  files = files.filter((f) => f.endsWith(pattern))
}
if (filter) {
  files = files.filter((f) => f.includes(filter))
}
if (skipAuth) {
  files = files.filter(
    (f) =>
      !f.includes('/lib/auth/') &&
      !f.includes('/lib/data/soft-delete') &&
      !f.includes('/lib/audit/') &&
      !f.includes('.test.') &&
      !f.includes('.spec.') &&
      !f.includes('/codemod/')
  )
}

if (files.length === 0) {
  console.error(`沒找到 .ts/.tsx file 符合 glob: ${glob}`)
  process.exit(1)
}

// ─────────────────────────────────────────────────────────────────────────────
// pattern matching

/**
 * 抓 supabase.from('xxx') 的 line。包含：
 *   - await supabase.from(...)...
 *   - const { data } = await supabase.from(...)...
 *   - supabase.from(...)... (chain 內、可能跨行)
 *
 * 跳過：
 *   - 已經被 enforceWorkspaceScope 包過的 line（粗略判斷：上下文有 enforceWorkspaceScope）
 *   - import 行
 *   - 註解 // 開頭
 */
const SUPABASE_FROM_RE = /supabase(?:Admin)?\.from\(\s*['"`]([a-zA-Z_][a-zA-Z0-9_]*)['"`]\s*\)/

// 公用主檔白名單（不應該被 workspace scope 包）
const PUBLIC_TABLES = new Set([
  'cities',
  'countries',
  'currencies',
  'languages',
  'public_holidays',
  'workspaces', // 通常是 admin client 直接用
  'auth.users',
  'profiles', // 看情境、預設提示警告
  'role_capabilities',
  'workspace_features',
])

const findings = []

for (const file of files) {
  const rel = relative(REPO_ROOT, file)
  let content
  try {
    content = readFileSync(file, 'utf8')
  } catch {
    continue
  }

  // 跳過已 import enforceWorkspaceScope 但仍漏寫的 file？不、還是要列、開發者要補
  const lines = content.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue
    if (trimmed.startsWith('import ')) continue

    const match = line.match(SUPABASE_FROM_RE)
    if (!match) continue

    const table = match[1]

    // 檢查是否已被 enforceWorkspaceScope 包過
    // 看本行 + 前 2 行
    const ctxStart = Math.max(0, i - 2)
    const ctxText = lines.slice(ctxStart, i + 1).join('\n')
    if (ctxText.includes('enforceWorkspaceScope(')) continue

    const isPublic = PUBLIC_TABLES.has(table)

    findings.push({
      file: rel,
      lineNum: i + 1,
      line,
      table,
      isPublic,
      // 判斷是否單行 query（從 .from 到行尾有 query 收斂、結尾為 ; 或被 = / await 接）
      // 粗略：line 含 .from(...) 且行尾以 ) 或 ;) 或 .single() 等收斂
      singleLine: /\.from\([^)]+\)[^=]*[);]\s*$/.test(line),
    })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 報告

if (findings.length === 0) {
  console.log('沒找到 supabase.from(...)、或全已被 enforceWorkspaceScope 包過。')
  process.exit(0)
}

console.log(`\n========================================`)
console.log(`掃描範圍：${glob}${filter ? ` (filter: ${filter})` : ''}`)
console.log(`File 數：${files.length}`)
console.log(`待改 call site：${findings.length}`)
console.log(`========================================\n`)

const byFile = new Map()
for (const f of findings) {
  if (!byFile.has(f.file)) byFile.set(f.file, [])
  byFile.get(f.file).push(f)
}

for (const [file, items] of byFile) {
  console.log(`\n--- ${file} (${items.length} 處) ---`)
  for (const item of items) {
    console.log(`\n  L${item.lineNum}  table=${item.table}${item.isPublic ? '  [公用主檔、考慮 allowCrossWorkspace]' : ''}`)
    console.log(`    原始: ${item.line.trim()}`)
    console.log(`    建議改寫：`)

    if (item.isPublic) {
      console.log(`      // 公用主檔、跨 workspace 共用`)
      console.log(`      enforceWorkspaceScope(<原 query>, ctx, { allowCrossWorkspace: true })`)
    } else {
      console.log(`      const { data, error } = await enforceWorkspaceScope(`)
      console.log(`        supabase.from('${item.table}').<chain>,`)
      console.log(`        { workspaceId: ctx.workspaceId }`)
      console.log(`      )`)
    }
  }
}

console.log(`\n========================================`)
console.log(`提醒：`)
console.log(`1. workspaceId 從哪拿、看現場：`)
console.log(`   - React hook → useLayoutContext().workspace?.id`)
console.log(`   - API route → 從 require-capability 拿到的 ctx.workspaceId`)
console.log(`   - service 層 → 從參數收、不要在 service 內部抓`)
console.log(`2. 公用主檔（cities/countries/...）用 { allowCrossWorkspace: true } opt-out`)
console.log(`3. .single() / .maybeSingle() 要移到 enforceWorkspaceScope(...) 之外：`)
console.log(`     await enforceWorkspaceScope(...).single()  // ❌ 會炸`)
console.log(`     (await enforceWorkspaceScope(...)).single()  // ❌`)
console.log(`     await enforceWorkspaceScope(query, ctx).single()  // ✅ 把 .single() 拿出 query`)
console.log(`4. 別忘了在 file 頂部加 import：`)
console.log(`   import { enforceWorkspaceScope } from '@/lib/auth/enforce-workspace-scope'`)
console.log(`========================================\n`)

// ─────────────────────────────────────────────────────────────────────────────
// --apply 模式

if (!apply) {
  console.log(`(dry-run 模式、未實際改檔。--apply 會嘗試改 single-line case、但仍要互動確認)\n`)
  process.exit(0)
}

console.log(`\n警告：--apply 模式只處理「單行、簡單」case、會跳過多行 query。`)
console.log(`即使如此、仍可能改錯（workspaceId 變數名、context 不對）。\n`)

const rl = createInterface({ input, output })
const ans = await rl.question('確定繼續？(yes/no) ')
rl.close()
if (ans.trim().toLowerCase() !== 'yes') {
  console.log('中止。')
  process.exit(0)
}

console.log(`\n--apply 尚未實作（風險高、建議手動 copy-paste）。`)
console.log(`若真要全自動、建議：`)
console.log(`  1. 用 jscodeshift / ts-morph 寫 AST-based codemod`)
console.log(`  2. 一個 feature 一個 feature 跑、跑完手動 review + type-check`)
console.log(`  3. PR 拆小、git diff 容易 review`)
process.exit(0)
