#!/usr/bin/env tsx
/**
 * audit-status.ts — 全站狀態 SSOT 偏離偵測
 *
 * 用法：
 *   npm run audit:status                # 跑全部、CI 模式（exit 1 if error）
 *   npm run audit:status -- --warn-only # 不擋 CI、只列 warning
 *
 * 設計：
 *   - 偵測散刻 status label 的 anti-pattern（避免下次再長）
 *   - SSOT：src/lib/design/status-tone-map.ts STATUS_LABEL_MAP / STATUS_TONE_MAP
 *
 * 對應 2026-05-15 William 拍板「狀態全盤 SSOT」+
 *   Logan-Workspace/2026-05-15-狀態-SSOT-盤點.md
 *
 * 偵測規則：
 *   D1. 自定義 STATUS_LABELS / STATUS_MAP / statusLabels 變數（除 SSOT 檔本身）
 *   D2. 內聯三元 status 翻譯（`status === 'X' ? '中文' : ...`）
 *   D3. 已知死 enum（billed / approved）出現在 .ts / .tsx
 *   D4. 中文當業務 status 值（譬如 `status: '已確認'`、`status: '待確認'`）
 *
 * 退出碼：0 = 全綠 / 1 = 有 error
 */

import { execSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '..')

const argv = process.argv.slice(2)
const flags = {
  warnOnly: argv.includes('--warn-only'),
}

interface Finding {
  rule: string
  severity: 'error' | 'warn'
  file: string
  line: number
  match: string
  hint: string
}

const findings: Finding[] = []

// SSOT 檔本身（白名單、跳過）
const SSOT_WHITELIST = [
  'src/lib/design/status-tone-map.ts',
  'src/components/ui/status-badge.tsx',
  'scripts/audit-status.ts',
]

function runGrep(pattern: string): string[] {
  try {
    const out = execSync(
      `grep -rEn ${JSON.stringify(pattern)} src/ --include='*.ts' --include='*.tsx'`,
      { cwd: REPO_ROOT, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }
    )
    return out.split('\n').filter(Boolean)
  } catch {
    return []
  }
}

function parseLine(raw: string): { file: string; line: number; text: string } | null {
  const m = raw.match(/^([^:]+):(\d+):(.*)$/)
  if (!m) return null
  return { file: m[1], line: parseInt(m[2], 10), text: m[3] }
}

function isWhitelisted(file: string): boolean {
  return SSOT_WHITELIST.some(w => file.includes(w) || file.endsWith(w))
}

// ─── D1：自定義 STATUS_LABELS / STATUS_MAP / statusLabels ───
// 抓宣告：const STATUS_LABELS = / export const statusLabels = / etc
function detectD1() {
  const lines = runGrep(
    '^[[:space:]]*(const|export[[:space:]]+const)[[:space:]]+(STATUS_LABELS|STATUS_MAP|statusLabels|statusColors|_STATUS_MAP|_statusMap)\\b'
  )
  for (const raw of lines) {
    const p = parseLine(raw)
    if (!p || isWhitelisted(p.file)) continue
    findings.push({
      rule: 'D1',
      severity: 'error',
      file: p.file,
      line: p.line,
      match: p.text.trim(),
      hint: '改用 getStatusLabelFor(type, status) / <StatusBadge type={...} status={...}>',
    })
  }
}

// ─── D2：內聯三元 status 翻譯成中文 ───
// 例：`status === 'confirmed' ? '已確認' : '待確認'`
// 不抓「英文 enum → 英文 enum」(那是正規化、不是翻譯)
function detectD2() {
  // grep 三元 + 兩個分支都含中文（CJK 範圍）
  const lines = runGrep(
    "status[[:space:]]*===[[:space:]]*'[a-z_]+'[[:space:]]*\\?[[:space:]]*'[^']*[\\xe4-\\xe9]"
  )
  for (const raw of lines) {
    const p = parseLine(raw)
    if (!p || isWhitelisted(p.file)) continue
    findings.push({
      rule: 'D2',
      severity: 'error',
      file: p.file,
      line: p.line,
      match: p.text.trim(),
      hint: '改用 getStatusLabelFor(type, status)',
    })
  }
}

// ─── D3：已知死 enum 字串 ───
// payment_requests 的 'billed' 已在 2026-05-15 砍掉、DB CHECK constraint 也擋了
// 注意：'approved' 在 quotes / user_leaves 等 type 仍合法、不列入 D3
const DEAD_ENUMS_FOR_PAYMENT_REQUESTS = ['billed']
function detectD3() {
  for (const dead of DEAD_ENUMS_FOR_PAYMENT_REQUESTS) {
    const lines = runGrep(`['\\\"]${dead}['\\\"]`)
    for (const raw of lines) {
      const p = parseLine(raw)
      if (!p || isWhitelisted(p.file)) continue
      // skip if line clearly mentions 'legacy' / '殘留' / '防呆' / 'comment'
      if (/legacy|殘留|防呆|歷史/.test(p.text)) continue
      // skip if line is a code comment
      if (/^\s*\/\/|^\s*\*/.test(p.text)) continue
      findings.push({
        rule: 'D3',
        severity: 'error',
        file: p.file,
        line: p.line,
        match: p.text.trim(),
        hint: `'${dead}' 是 payment_requests 的死 enum、DB CHECK 已擋、寫入會炸`,
      })
    }
  }
}

// ─── D4：中文當業務 status 值 ───
// status: '已確認' / status: '待確認' / status: '已付款' 等
function detectD4() {
  const lines = runGrep(
    "status[[:space:]]*:[[:space:]]*'(已確認|待確認|已付款|未付款|待付款|草稿|已過帳|已沖銷)'"
  )
  for (const raw of lines) {
    const p = parseLine(raw)
    if (!p || isWhitelisted(p.file)) continue
    findings.push({
      rule: 'D4',
      severity: 'error',
      file: p.file,
      line: p.line,
      match: p.text.trim(),
      hint: '不該用中文當業務 status 值、改成英文 enum',
    })
  }
}

// ─── Run ───
detectD1()
detectD2()
detectD3()
detectD4()

// ─── Report ───
const errors = findings.filter(f => f.severity === 'error')
const warns = findings.filter(f => f.severity === 'warn')

console.log('\n═══ audit:status — 狀態 SSOT 偏離偵測 ═══\n')
console.log(`Errors: ${errors.length}`)
console.log(`Warnings: ${warns.length}\n`)

if (errors.length > 0) {
  console.log('─── ERRORS ───')
  for (const f of errors) {
    console.log(`  [${f.rule}] ${f.file}:${f.line}`)
    console.log(`        ${f.match}`)
    console.log(`        → ${f.hint}`)
  }
  console.log()
}

if (warns.length > 0) {
  console.log('─── WARNINGS ───')
  for (const f of warns) {
    console.log(`  [${f.rule}] ${f.file}:${f.line}`)
    console.log(`        ${f.match}`)
    console.log(`        → ${f.hint}`)
  }
  console.log()
}

if (errors.length === 0 && warns.length === 0) {
  console.log('✅ 全綠、沒有狀態 SSOT 偏離\n')
  process.exit(0)
}

if (flags.warnOnly) {
  process.exit(0)
}

process.exit(errors.length > 0 ? 1 : 0)
