#!/usr/bin/env node
/**
 * Venturo Audit Snapshot — 一頁式健康儀表板
 *
 * 用法：
 *   node scripts/audit/snapshot.mjs
 *   node scripts/audit/snapshot.mjs --quick   # 跳過 vitest（最慢的一段）
 *   npm run audit:snapshot
 *
 * 印當前所有指標：
 *   📊 Test       — vitest 全套（pass/fail/skip）
 *   🛡 ESLint     — warning 模式總數 + top rules
 *   🔍 Pattern    — detector 違規數（hard-fail / informational）
 *   📝 Docs       — 過期 / 沒 expiry header
 *   🔧 Layer 4    — scaffold / codemod 工具數
 *   🎯 健康分數    — 0-100 綜合
 *   📈 vs 上次    — diff 上次 cached snapshot
 *
 * 設計：
 * - 純 read-only、不動任何檔
 * - cache 寫到 scripts/audit/.last-snapshot.json（被 .gitignore 忽略）
 * - 跑時間 < 30s（quick 模式更快、跳 vitest）
 */

import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join, dirname, resolve, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '../..')
const CACHE_FILE = join(__dirname, '.last-snapshot.json')

const args = process.argv.slice(2)
const QUICK = args.includes('--quick') || args.includes('--snapshot-quick')

// ─────────────────────────────────────────────────────────────────────────────
// 工具

function fmtNow() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function safeExec(cmd, opts = {}) {
  try {
    return execSync(cmd, {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      maxBuffer: 100 * 1024 * 1024, // 100 MB — eslint json 在大型 repo 容易超過預設 1 MB
      ...opts,
    })
  } catch (err) {
    // 即使 non-zero 退出、stdout 還是抓得到（eslint warnings 會 exit 0、但有 errors 會 exit 1）
    return err.stdout || ''
  }
}

function diff(curr, prev, label = '') {
  if (prev === undefined || prev === null) return ''
  const d = curr - prev
  if (d === 0) return `   (=)`
  const sign = d > 0 ? '+' : ''
  // 對 warning / violation：減少是好（綠）、增加是壞（紅）
  // 對 test 數 / pass 數：增加是好（綠）、減少是壞（紅）
  const goodIfDown = ['warnings', 'violations', 'expired', 'noFrontmatter', 'failed'].some((k) => label.includes(k))
  const isGood = goodIfDown ? d < 0 : d > 0
  const arrow = isGood ? '↓ 改善' : d > 0 ? '↑ 增加' : '↓ 減少'
  return `   (${sign}${d} ${arrow})`
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Test (vitest)

function collectTests() {
  if (QUICK) {
    return { quickSkipped: true, reason: '--quick mode' }
  }
  const out = safeExec('npx vitest run --reporter=json --silent 2>/dev/null')
  // vitest --reporter=json 印一個大 JSON 在 stdout
  // 但 silent 還是會吐 banner、要找 JSON 起始
  const startIdx = out.indexOf('{"numTotalTestSuites"')
  if (startIdx < 0) return { error: 'vitest output not found' }
  let json
  try {
    // 從 startIdx 開始切到結尾、若結尾有非 JSON 字符也試著再切
    const slice = out.slice(startIdx)
    // 找最後一個 } — 大致 JSON 結尾
    const endIdx = slice.lastIndexOf('}')
    json = JSON.parse(slice.slice(0, endIdx + 1))
  } catch (e) {
    return { error: `parse fail: ${e.message}` }
  }
  // numTotalTests / numPassedTests / numFailedTests / numPendingTests / numTodoTests
  // numTotalTestSuites = file 數
  return {
    files: json.numTotalTestSuites,
    total: json.numTotalTests,
    passed: json.numPassedTests,
    failed: json.numFailedTests,
    skipped: json.numPendingTests + json.numTodoTests,
    success: json.success,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. ESLint

function collectEslint() {
  const out = safeExec('npx eslint . --format json 2>/dev/null')
  if (!out.trim()) return { error: 'eslint output empty' }
  let arr
  try {
    arr = JSON.parse(out)
  } catch (e) {
    return { error: `parse fail: ${e.message}` }
  }
  let warnings = 0
  let errors = 0
  const ruleCounter = new Map()
  for (const f of arr) {
    for (const m of f.messages || []) {
      if (m.severity === 1) warnings++
      else if (m.severity === 2) errors++
      const r = m.ruleId || '(no-rule)'
      ruleCounter.set(r, (ruleCounter.get(r) || 0) + 1)
    }
  }
  const topRules = [...ruleCounter.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
  return { warnings, errors, totalRules: ruleCounter.size, topRules }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Pattern Detectors

function collectPatterns() {
  // 跑 check-all.mjs、parse stdout
  const out = safeExec('node scripts/pattern-detectors/check-all.mjs 2>/dev/null')
  // 每行：
  //   "  P001 (...) ... ✅ 0 處短路 / ..."
  //   "  P100 (...) ... ✅ 12 處 feature/data/stores 直連 supabase.from()（拆遷目標、配 ADR-0001）"
  // 我們從每行抓「✅/❌」+ pattern id + 數字
  const lines = out.split('\n')
  const detectors = []
  // hard-fail 名單（從 check-all.mjs 的 detector 區分）
  // pass=true 而且不是 informational only 的算 hard-fail
  // 從 message 內容判斷：紅線級 detector 都是 P001 / P004 / P016 / P017 / P018 / P020 / P022（hard-fail）
  // 其他 P100-P110 + API_UNGUARDED 都 informational
  const HARD_FAIL_IDS = ['P001', 'P004', 'P016', 'P017', 'P018', 'P020', 'P022']
  const INFO_IDS = ['P100', 'P101', 'P102', 'P103', 'P104', 'P105', 'P106', 'P109', 'P110', 'API_UNGUARDED']
  const RED_LINE_IDS = ['P100', 'P101', 'P102', 'P103', 'P109'] // William 點名要分別印的紅線級

  // 解析每個 detector 的數字
  // status: 'pass' | 'fail' | 'error'
  const perDetector = {} // { P001: { violations: N, status: 'pass'|'fail'|'error' } }
  for (const line of lines) {
    const m = line.match(/\s+([A-Z_0-9]+)\s+\([^)]+\)\s+\.\.\.\s+(✅|❌|💥)\s+(.*)/)
    if (!m) continue
    const id = m[1]
    const sym = m[2]
    const msg = m[3]
    // 抽第一個數字
    const numMatch = msg.match(/^(\d+)/)
    const violations = numMatch ? parseInt(numMatch[1], 10) : 0
    const status = sym === '✅' ? 'pass' : sym === '❌' ? 'fail' : 'error'
    perDetector[id] = { violations, status }
  }

  let hardFailViolations = 0
  let infoViolations = 0
  let totalViolations = 0
  let hardFailFailedCount = 0
  let hardFailErroredCount = 0
  for (const id of HARD_FAIL_IDS) {
    if (!perDetector[id]) continue
    hardFailViolations += perDetector[id].violations
    totalViolations += perDetector[id].violations
    if (perDetector[id].status === 'fail') hardFailFailedCount++
    else if (perDetector[id].status === 'error') hardFailErroredCount++
  }
  for (const id of INFO_IDS) {
    if (!perDetector[id]) continue
    infoViolations += perDetector[id].violations
    totalViolations += perDetector[id].violations
  }

  // 紅線級每個分別印
  const redLines = {}
  for (const id of RED_LINE_IDS) {
    redLines[id] = perDetector[id]?.violations ?? null
  }

  return {
    hardFailViolations,
    hardFailFailedCount,
    hardFailErroredCount,
    infoViolations,
    totalViolations,
    redLines,
    perDetector,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Documentation

function collectDocs() {
  const docsDir = join(REPO_ROOT, 'docs')
  if (!existsSync(docsDir)) return { total: 0, withExpiry: 0, expired: 0, noFrontmatter: 0 }

  function walk(dir) {
    const out = []
    for (const f of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, f.name)
      if (f.isDirectory()) out.push(...walk(full))
      else if (f.name.endsWith('.md')) out.push(full)
    }
    return out
  }

  const files = walk(docsDir)
  const today = new Date()
  let withExpiry = 0
  let expired = 0
  let noFrontmatter = 0
  for (const f of files) {
    const c = readFileSync(f, 'utf8')
    const fm = c.match(/^---\n([\s\S]*?)\n---/)
    if (!fm) {
      noFrontmatter++
      continue
    }
    const ex = fm[1].match(/expires_after:\s*(\d{4}-\d{2}-\d{2})/)
    if (!ex) {
      noFrontmatter++
      continue
    }
    withExpiry++
    if (new Date(ex[1]) < today) expired++
  }
  return { total: files.length, withExpiry, expired, noFrontmatter }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Layer 4 Tools

function collectTools() {
  function countMjs(dir) {
    if (!existsSync(dir)) return 0
    return readdirSync(dir).filter((f) => f.endsWith('.mjs')).length
  }
  const scaffolds = countMjs(join(REPO_ROOT, 'scripts/scaffold'))
  const codemods = countMjs(join(REPO_ROOT, 'scripts/codemod'))
  const detectors = countMjs(join(REPO_ROOT, 'scripts/pattern-detectors'))
  return { scaffolds, codemods, detectors }
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. 健康分數 (0-100)
//
// 公式：
//   - Test 健康度（最高 30 分）：pass / total * 30；fail 直接 0
//   - ESLint 健康度（最高 25 分）：warnings 越少越好、5000 → 0、0 → 25
//   - Pattern hard-fail（最高 25 分）：hard-fail 失敗 detector 數越少越好、0 = 25
//   - Pattern info（最高 10 分）：info violations 越少越好、3000 → 0、0 → 10
//   - Docs（最高 10 分）：過期數越少越好

function computeScore({ test, eslint, patterns, docs }) {
  let score = 0

  // Test (30 分)
  if (test && !test.quickSkipped && !test.error) {
    if (test.failed > 0) score += 0
    else if (test.total > 0) score += Math.round((test.passed / test.total) * 30)
  } else {
    // skipped / error → 給 20 分（保守、不知道）
    score += 20
  }

  // ESLint (25 分)
  if (eslint && !eslint.error) {
    const w = eslint.warnings
    // 線性映射：0 → 25、5000 → 0
    const cap = 5000
    score += Math.max(0, Math.round(25 * (1 - Math.min(w, cap) / cap)))
  } else {
    score += 12
  }

  // Pattern hard-fail (25 分)
  // errored detector 不算「失敗」（多半是 token 失效跑不到 SQL）、給保守分
  if (patterns) {
    if (patterns.hardFailFailedCount === 0) {
      // 全 pass 給滿、有 errored 扣一點代表「不確定」
      score += Math.max(15, 25 - patterns.hardFailErroredCount * 2)
    } else {
      score += Math.max(0, 25 - patterns.hardFailFailedCount * 5 - patterns.hardFailErroredCount * 2)
    }
  } else {
    score += 12
  }

  // Pattern info (10 分)
  if (patterns) {
    const v = patterns.infoViolations
    const cap = 3000
    score += Math.max(0, Math.round(10 * (1 - Math.min(v, cap) / cap)))
  } else {
    score += 5
  }

  // Docs (10 分)
  if (docs && docs.total > 0) {
    const bad = docs.expired + docs.noFrontmatter
    score += Math.max(0, Math.round(10 * (1 - Math.min(bad, docs.total) / docs.total)))
  } else {
    score += 5
  }

  return Math.max(0, Math.min(100, score))
}

// ─────────────────────────────────────────────────────────────────────────────
// 主流程

async function main() {
  const startMs = Date.now()
  console.log(`\n🩺 Venturo Audit Snapshot — ${fmtNow()}${QUICK ? '  [QUICK 模式、跳過 vitest]' : ''}\n`)

  // ── 跑各區
  process.stdout.write('  · 跑 vitest ... ')
  const test = collectTests()
  console.log(test.quickSkipped ? 'skipped' : test.error ? `error: ${test.error}` : `${test.passed}/${test.total}`)

  process.stdout.write('  · 跑 eslint ... ')
  const eslint = collectEslint()
  console.log(eslint.error ? `error: ${eslint.error}` : `${eslint.warnings} warn / ${eslint.errors} err`)

  process.stdout.write('  · 跑 pattern detectors ... ')
  const patterns = collectPatterns()
  console.log(`${patterns.totalViolations} violations`)

  process.stdout.write('  · 掃 docs ... ')
  const docs = collectDocs()
  console.log(`${docs.total} 份`)

  process.stdout.write('  · 數 layer 4 tools ... ')
  const tools = collectTools()
  console.log(`${tools.scaffolds + tools.codemods + tools.detectors} 個`)

  const score = computeScore({ test, eslint, patterns, docs })

  // ── 上次 snapshot
  let prev = null
  if (existsSync(CACHE_FILE)) {
    try {
      prev = JSON.parse(readFileSync(CACHE_FILE, 'utf8'))
    } catch {
      // ignore
    }
  }

  const elapsed = ((Date.now() - startMs) / 1000).toFixed(1)
  console.log(`\n  ⏱  跑完 ${elapsed}s`)
  console.log(`\n${'━'.repeat(60)}`)

  // ─── 印報告

  // Test
  console.log(`\n📊 Test`)
  if (test.quickSkipped) {
    console.log(`- 跳過（${test.reason}）`)
  } else if (test.error) {
    console.log(`- 錯誤：${test.error}`)
  } else {
    console.log(`- File 數：${test.files}${diff(test.files, prev?.test?.files, 'tests')}`)
    console.log(`- Pass：${test.passed} / ${test.failed} failed / ${test.skipped} skipped${diff(test.passed, prev?.test?.passed, 'passed')}`)
  }

  // ESLint
  console.log(`\n🛡 ESLint`)
  if (eslint.error) {
    console.log(`- 錯誤：${eslint.error}`)
  } else {
    console.log(`- Rule 數：${eslint.totalRules}（warning 模式為主）`)
    console.log(`- Total warnings：${eslint.warnings}${diff(eslint.warnings, prev?.eslint?.warnings, 'warnings')}`)
    if (eslint.errors > 0) console.log(`- Errors：${eslint.errors} ⚠️`)
    if (eslint.topRules?.length) {
      const tops = eslint.topRules.map(([r, n]) => `${r} (${n})`).join(', ')
      console.log(`- Top: ${tops}`)
    }
  }

  // Pattern Detector
  console.log(`\n🔍 Pattern Detector`)
  const errSuffix = patterns.hardFailErroredCount > 0 ? `、${patterns.hardFailErroredCount} 個 errored（多半是 SUPABASE_ACCESS_TOKEN 失效、跑不到 SQL）` : ''
  console.log(`- Hard-fail：${patterns.hardFailFailedCount} 個 detector 失敗（${patterns.hardFailViolations} violations）${errSuffix}${diff(patterns.hardFailFailedCount, prev?.patterns?.hardFailFailedCount, 'failed')}`)
  console.log(`- Informational：${patterns.infoViolations} violations${diff(patterns.infoViolations, prev?.patterns?.infoViolations, 'violations')}`)
  console.log(`- Total violations：${patterns.totalViolations}${diff(patterns.totalViolations, prev?.patterns?.totalViolations, 'violations')}`)
  const redParts = []
  for (const [id, v] of Object.entries(patterns.redLines)) {
    if (v === null || v === undefined) continue
    const prevV = prev?.patterns?.redLines?.[id]
    redParts.push(`${id}=${v}${prevV !== undefined && prevV !== null ? (v - prevV === 0 ? '' : ` (${v - prevV > 0 ? '+' : ''}${v - prevV})`) : ''}`)
  }
  console.log(`- 紅線級：${redParts.join(' / ')}`)

  // Docs
  console.log(`\n📝 Documentation`)
  console.log(`- Docs 數：${docs.total}${diff(docs.total, prev?.docs?.total, 'docs')}`)
  const pct = docs.total > 0 ? Math.round((docs.withExpiry / docs.total) * 100) : 0
  console.log(`- 有 expiry：${docs.withExpiry} (${pct}%)${diff(docs.withExpiry, prev?.docs?.withExpiry, 'withExpiry')}`)
  console.log(`- 過期：${docs.expired}${diff(docs.expired, prev?.docs?.expired, 'expired')}`)
  console.log(`- 沒 frontmatter：${docs.noFrontmatter}${diff(docs.noFrontmatter, prev?.docs?.noFrontmatter, 'noFrontmatter')}`)

  // Tools
  console.log(`\n🔧 Layer 4 Tools`)
  console.log(`- Scaffolds：scripts/scaffold/*.mjs ${tools.scaffolds} 個${diff(tools.scaffolds, prev?.tools?.scaffolds, 'scaffolds')}`)
  console.log(`- Codemods：scripts/codemod/*.mjs ${tools.codemods} 個${diff(tools.codemods, prev?.tools?.codemods, 'codemods')}`)
  console.log(`- Detectors：scripts/pattern-detectors/*.mjs ${tools.detectors} 個`)

  // 健康分數
  console.log(`\n🎯 健康分數（0-100）`)
  const prevScore = prev?.score
  let diffStr = ''
  if (prevScore !== undefined) {
    const d = score - prevScore
    if (d === 0) diffStr = '   (=)'
    else if (d > 0) diffStr = `   (+${d} 改善 ↑)`
    else diffStr = `   (${d} 退步 ↓)`
  }
  console.log(`${score}${diffStr}  (test ↑ / warnings ↓ / hard-fail ↓ / info violations ↓ / 過期 docs ↓)`)

  // vs 上次
  if (prev) {
    console.log(`\n📈 vs 上次（${prev.timestamp}）`)
    if (test && !test.quickSkipped && !test.error && prev.test) {
      const tDiff = test.total - (prev.test.total || 0)
      console.log(`- Tests ${tDiff > 0 ? '+' : ''}${tDiff}`)
    }
    if (eslint && !eslint.error && prev.eslint) {
      const wDiff = eslint.warnings - (prev.eslint.warnings || 0)
      console.log(`- Warnings ${wDiff > 0 ? '+' : ''}${wDiff}`)
    }
    if (prev.patterns) {
      const vDiff = patterns.totalViolations - (prev.patterns.totalViolations || 0)
      console.log(`- Violations ${vDiff > 0 ? '+' : ''}${vDiff}`)
    }
    if (prev.docs) {
      const eDiff = docs.expired - (prev.docs.expired || 0)
      console.log(`- 過期 docs ${eDiff > 0 ? '+' : ''}${eDiff}`)
    }
  } else {
    console.log(`\n📈 vs 上次：（首次跑、無 baseline）`)
  }

  console.log(`\n${'━'.repeat(60)}\n`)

  // ── 寫 cache（snapshot.json）
  const snapshot = {
    timestamp: fmtNow(),
    score,
    elapsed_seconds: parseFloat(elapsed),
    test,
    eslint,
    patterns,
    docs,
    tools,
  }
  try {
    writeFileSync(CACHE_FILE, JSON.stringify(snapshot, null, 2))
    console.log(`💾 已存 ${relative(REPO_ROOT, CACHE_FILE)}（下次跑會 diff）\n`)
  } catch (e) {
    console.error(`(寫 cache 失敗：${e.message})`)
  }
}

main().catch((err) => {
  console.error(`\n💥 Fatal: ${err.stack || err.message}`)
  process.exit(1)
})
