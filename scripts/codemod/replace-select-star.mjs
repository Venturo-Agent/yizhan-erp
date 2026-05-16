#!/usr/bin/env node
/**
 * Codemod helper：把 `.select('*')` / `.select("*")` 改成明確 column projection
 *
 * 配 P102 detector（scripts/pattern-detectors/check-all.mjs）
 * 配 refactor-backlog #1（payload 多扛 50-70%、效能 #2 紅線）
 *
 * 用法：
 *   node scripts/codemod/replace-select-star.mjs <file-glob>
 *   node scripts/codemod/replace-select-star.mjs "src/**"
 *   node scripts/codemod/replace-select-star.mjs "src/features/tours/**"
 *   npm run codemod:select-projection -- "src/**"
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 為什麼是「半自動 helper」、不是真 codemod
 *
 * 1. column projection 是業務決定、不是機器決定：
 *    `.select('*')` 拿全表 → 改 `.select('id, code, name, created_at')` ?
 *    要看那段 code 真正用到什麼欄位、機器看不出來。
 *
 * 2. 有些 `.select('*')` 是合法的：
 *    - `.select('*', { count: 'exact', head: true })` 只拿 count、head:true 不傳資料
 *    - 只列出來提醒 reviewer、不一定要改
 *
 * 3. 有些檔案是 helper 自己（typed-client / enforce-workspace-scope）、註解 / 文檔範例不該動
 *
 * 所以本工具：
 *   - 預設 dry-run / list-only
 *   - 列出 file:line + 原始 + 建議改寫範本（從 src/types/ 推測欄位、抓不到給 placeholder）
 *   - 不動 src/、不 commit
 *   - 開發者自己 copy-paste、自己決定列哪些欄位
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs'
import { join, relative, dirname, resolve, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '../..')

// ─────────────────────────────────────────────────────────────────────────────
// CLI

const args = process.argv.slice(2)
if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  console.log(`
Codemod helper：把 .select('*') 改成明確 column projection

用法：
  node scripts/codemod/replace-select-star.mjs <glob>

選項：
  --filter <substring>   只處理 path 含此字串的 file
  --skip-helpers         跳過 helper / typed-client / 註解範例（預設開）
  --include-count-only   也列「.select('*', { count, head: true })」（預設不列、它是合法用法）
  -h, --help             顯示本說明

範例：
  node scripts/codemod/replace-select-star.mjs "src/**"
  node scripts/codemod/replace-select-star.mjs "src/features/tours/**"
  node scripts/codemod/replace-select-star.mjs "src/**" --filter stores
`)
  process.exit(0)
}

const glob = args.find((a) => !a.startsWith('--'))
const filterIdx = args.indexOf('--filter')
const filter = filterIdx >= 0 ? args[filterIdx + 1] : null
const skipHelpers = !args.includes('--no-skip-helpers')
const includeCountOnly = args.includes('--include-count-only')

if (!glob) {
  console.error('錯誤：缺 glob 參數。試 --help')
  process.exit(1)
}

// ─────────────────────────────────────────────────────────────────────────────
// glob expand（簡易、只支援 ** 跟 *.ext）

function parseGlob(g) {
  const cleaned = g.replace(/^['"]|['"]$/g, '')
  const starIdx = cleaned.indexOf('*')
  if (starIdx === -1) return { base: cleaned, pattern: null }
  const baseEnd = cleaned.lastIndexOf('/', starIdx)
  const base = baseEnd === -1 ? '.' : cleaned.slice(0, baseEnd)
  const tail = cleaned.slice(baseEnd + 1)
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
      if (ext === '.ts' || ext === '.tsx') fileList.push(full)
    }
  }
  return fileList
}

const { base, pattern } = parseGlob(glob)
const baseAbs = resolve(REPO_ROOT, base)
let files = walk(baseAbs)

if (pattern) files = files.filter((f) => f.endsWith(pattern))
if (filter) files = files.filter((f) => f.includes(filter))
if (skipHelpers) {
  files = files.filter(
    (f) =>
      !f.includes('/lib/supabase/typed-client') &&
      !f.includes('/lib/auth/enforce-workspace-scope') &&
      !f.includes('/lib/cache/preload-config') &&
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

// 匹配 .select('*') 或 .select("*")、容許前後空白
// 不匹配 .select('id, code') 等明確 projection
const SELECT_STAR_RE = /\.select\(\s*['"]\*['"]\s*(,|\))/

// 進一步判斷是否「count-only」case：.select('*', { count: ..., head: true })
const COUNT_ONLY_RE = /\.select\(\s*['"]\*['"]\s*,\s*\{[^}]*head\s*:\s*true[^}]*\}\s*\)/

// 嘗試從本行 / 前後 3 行抓 .from('table_name') 推 table
const FROM_TABLE_RE = /\.from\(\s*['"`]([a-zA-Z_][a-zA-Z0-9_]*)['"`]\s*\)/

// ─────────────────────────────────────────────────────────────────────────────
// table → 建議欄位 map（從 src/types/ + 常見業務知識推測）
// 抓不到的 table 給 placeholder、reviewer 自填

const TABLE_HINTS = {
  workspaces: 'id, code, name, created_at',
  employees: 'id, code, name, email, role_id, status, created_at',
  customers: 'id, code, name, phone, email, status, created_at',
  tours: 'id, code, name, departure_date, return_date, status, workspace_id, created_at',
  orders: 'id, code, tour_id, customer_id, status, total_amount, workspace_id, created_at',
  quotes: 'id, code, tour_id, customer_id, status, total_amount, workspace_id, created_at',
  payment_requests: 'id, code, tour_id, status, total_amount, workspace_id, created_at',
  payment_request_items: 'id, payment_request_id, description, amount, currency',
  disbursement_orders: 'id, code, status, total_amount, workspace_id, created_at',
  receipts: 'id, code, order_id, status, total_amount, workspace_id, created_at',
  suppliers: 'id, code, name, type, status, workspace_id, created_at',
  todo_columns: 'id, name, color, sort_order, workspace_id, created_at',
  workspace_features: 'id, workspace_id, feature_code, enabled',
  role_capabilities: 'id, role_id, capability_code',
  audit_logs: 'id, table_name, row_id, action, performed_by, performed_at, before_data, after_data',
}

function suggestColumns(table) {
  if (!table) return null
  if (TABLE_HINTS[table]) return TABLE_HINTS[table]
  // 嘗試從 src/types/<table>.types.ts 抓 interface（粗略）
  const typeFile = resolve(REPO_ROOT, `src/types/${table.replace(/s$/, '')}.types.ts`)
  if (existsSync(typeFile)) {
    return `// 參考 src/types/${table.replace(/s$/, '')}.types.ts 的 interface 列出實際需要欄位`
  }
  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// scan

const findings = []

for (const file of files) {
  const rel = relative(REPO_ROOT, file)
  let content
  try {
    content = readFileSync(file, 'utf8')
  } catch {
    continue
  }

  const lines = content.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    // 跳過註解 / 文檔範例
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue

    if (!SELECT_STAR_RE.test(line)) continue

    const isCountOnly = COUNT_ONLY_RE.test(line)
    if (isCountOnly && !includeCountOnly) {
      // 仍記錄、但標 [count-only / 合法]、預設不列出
      continue
    }

    // 推測 table：本行先抓、抓不到掃前 3 行 + 後 3 行
    let table = null
    const localMatch = line.match(FROM_TABLE_RE)
    if (localMatch) {
      table = localMatch[1]
    } else {
      const ctxStart = Math.max(0, i - 3)
      const ctxEnd = Math.min(lines.length, i + 4)
      for (let j = ctxStart; j < ctxEnd; j++) {
        const m = lines[j].match(FROM_TABLE_RE)
        if (m) {
          table = m[1]
          break
        }
      }
    }

    findings.push({
      file: rel,
      lineNum: i + 1,
      line,
      table,
      isCountOnly,
      suggestion: suggestColumns(table),
    })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 報告

if (findings.length === 0) {
  console.log("沒找到 .select('*')、或全是 count-only 合法用法（用 --include-count-only 強制列）。")
  process.exit(0)
}

console.log(`\n========================================`)
console.log(`掃描範圍：${glob}${filter ? ` (filter: ${filter})` : ''}`)
console.log(`File 數：${files.length}`)
console.log(`待改 call site：${findings.length}`)
console.log(`(skipHelpers=${skipHelpers}  includeCountOnly=${includeCountOnly})`)
console.log(`========================================\n`)

const byFile = new Map()
for (const f of findings) {
  if (!byFile.has(f.file)) byFile.set(f.file, [])
  byFile.get(f.file).push(f)
}

for (const [file, items] of byFile) {
  console.log(`\n--- ${file} (${items.length} 處) ---`)
  for (const item of items) {
    const tableLabel = item.table ? `table=${item.table}` : 'table=??'
    const countTag = item.isCountOnly ? '  [count-only / 多半合法]' : ''
    console.log(`\n  L${item.lineNum}  ${tableLabel}${countTag}`)
    console.log(`    原始: ${item.line.trim()}`)
    console.log(`    建議改寫：`)
    if (item.suggestion) {
      if (item.suggestion.startsWith('//')) {
        console.log(`      ${item.suggestion}`)
        console.log(`      .select('// TODO: 列出實際需要的欄位')`)
      } else {
        console.log(`      .select('${item.suggestion}')`)
      }
    } else {
      console.log(`      .select('// TODO: 列出實際需要的欄位')`)
    }
  }
}

console.log(`\n========================================`)
console.log(`提醒：`)
console.log(`1. .select('*') 會扛全表 payload、SaaS 化下讀取量 = Supabase 成本（CLAUDE.md 效能 #2）`)
console.log(`2. 改 column projection 時、只列「該段 code 真正用到的欄位」、不要照抄 hint`)
console.log(`3. .select('*', { count: 'exact', head: true }) 是合法的（只拿 count、不傳資料）、本工具預設不列`)
console.log(`4. 若 .select('*') 後接 .single() 或拿來組 detail view、可能真要全欄、用 // codemod-ignore: select-star-justified 註解標註`)
console.log(`5. 改完後跑：`)
console.log(`     npm run type-check`)
console.log(`     npm run check:patterns      # 看 P102 數字有沒有降`)
console.log(`========================================\n`)

console.log(`(dry-run 模式、未實際改檔。column projection 是業務決定、本工具不提供 --apply)\n`)
process.exit(0)
