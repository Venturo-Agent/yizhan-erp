#!/usr/bin/env node
/**
 * audit-write-paths — 偵測「同一張表的 INSERT 散在 DB trigger + API code 兩處」的 SSOT 撞車風險
 *
 * 為什麼存在：
 *   2026-05-17 抓到 trg_workspaces_onboarding_seed 跟 createDimensions() 各建一份 HQ
 *   撞 unique key、整條 tenant create 死透。回溯發現這類「兩個地方都寫同表」
 *   過去也踩過好幾次（5/12 Channels SSOT 漏一個註冊點、之類）。
 *   寫這隻 script 讓下個工程師加新 trigger / 新 API insert 前能先 npm run audit:writes、
 *   看見「branches 已經有 2 個寫入路徑、再加會撞」、提前 stop。
 *
 * 偵測對象（不窮舉、抓最常炸的兩種）：
 *   1. DB trigger 的 PL/pgSQL 函式內 INSERT INTO <table>
 *   2. API route（src/app/api/**\/route.ts）的 .from('<table>').insert(...)
 *
 * 不偵測（可能假陽性、之後再加）：
 *   - UPDATE / DELETE（撞 unique 機率低、但會 race）
 *   - entity hook / SWR mutation（前端寫入、走 API）
 *   - 直接 SQL editor 跑的 ad-hoc SQL（無檔可查）
 *
 * 怎麼跑：
 *   npx tsx scripts/audit-write-paths.ts
 *   # 或加進 package.json：npm run audit:writes
 */

import { readFile, readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'

const MIGRATIONS_DIR = 'supabase/migrations'
const API_DIR = 'src/app/api'

// 已知「合理雙寫」白名單（譬如純 audit、純技術 housekeeping）
// 加進來前必須先看過、確認不會撞 unique / FK
const ALLOWLIST = new Set<string>([
  // channel_members — 兩條寫入路徑刻意分工、不撞：
  //   1. RPC get_or_create_dm_channel(): 建 DM 頻道時、原子把雙方成員一起塞進去
  //   2. API /channels/dm/route.ts: 群組頻道 / 邀人入群時、走應用層加成員（capability check + audit context）
  // 場景不同（DM 自動 vs 群組手動）、不會同時對同一組 (channel_id, employee_id) 寫入
  'channel_members',

  // journal_lines — 會計分錄 SSOT、兩條寫入路徑：
  //   1. Trigger auto_post_*（收款 / 付款 / 出納確認時）: 業務單據自動產分錄
  //   2. API /accounting/{vouchers,opening-balances,period-closing,receipts/refund}: 手動傳票、開帳、期末結轉、退款沖正
  // 場景不同（自動分錄 vs 手動傳票）、各自寫不同 voucher_id 下的 lines、不會撞
  'journal_lines',
])

interface WriteSite {
  table: string
  file: string
  line: number
  source: 'trigger' | 'api'
  context: string
}

async function walk(dir: string, exts: string[]): Promise<string[]> {
  const out: string[] = []
  async function recurse(d: string) {
    const entries = await readdir(d)
    for (const e of entries) {
      const full = join(d, e)
      const s = await stat(full)
      if (s.isDirectory()) {
        if (e.startsWith('_') || e === 'node_modules' || e === '.next') continue
        await recurse(full)
      } else if (exts.some(ext => full.endsWith(ext))) {
        out.push(full)
      }
    }
  }
  await recurse(dir)
  return out
}

interface MigSite extends WriteSite {
  fnName: string
}

async function scanMigrations(): Promise<WriteSite[]> {
  const files = (await walk(MIGRATIONS_DIR, ['.sql'])).sort() // 時間戳 sort = chronological
  const sites: MigSite[] = []
  // 已被 DROP 的函式名（在後續 migration 砍）→ 排除其 INSERT
  const droppedFns = new Set<string>()
  const insertRe = /INSERT\s+INTO\s+(?:public\.)?([a-z_][a-z0-9_]*)/gi
  const fnNameRe = /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:public\.)?([a-z_][a-z0-9_]*)\s*\(/i
  const dropFnRe = /DROP\s+FUNCTION(?:\s+IF\s+EXISTS)?\s+(?:public\.)?([a-z_][a-z0-9_]*)\s*\(?/gi
  for (const f of files) {
    const text = await readFile(f, 'utf8')
    const lines = text.split('\n')
    // 先掃這檔的 DROP FUNCTION、標進 droppedFns
    text.matchAll(dropFnRe).forEach(m => droppedFns.add(m[1].toLowerCase()))
    // state machine：
    //   pendingFn = 看到 CREATE FUNCTION、等開頭的 $$
    //   inBody = 已進函式 body、收 INSERT
    let pendingFn = false
    let inBody = false
    let fnHead = ''
    let fnName = ''
    lines.forEach((line, idx) => {
      if (!inBody) {
        const fnMatch = line.match(fnNameRe)
        if (fnMatch) {
          pendingFn = true
          fnHead = line.trim().slice(0, 80)
          fnName = fnMatch[1].toLowerCase()
        }
      }
      const dollars = (line.match(/\$\$/g) || []).length
      for (let i = 0; i < dollars; i++) {
        if (pendingFn && !inBody) {
          inBody = true
          pendingFn = false
        } else if (inBody) {
          inBody = false
        }
      }
      if (inBody) {
        const m = [...line.matchAll(insertRe)]
        for (const match of m) {
          sites.push({
            table: match[1].toLowerCase(),
            file: f,
            line: idx + 1,
            source: 'trigger',
            context: fnHead,
            fnName,
          })
        }
      }
    })
  }
  // 過濾掉「函式之後被 DROP」的 INSERT、避免假陽性
  return sites.filter(s => !droppedFns.has(s.fnName))
}

async function scanApi(): Promise<WriteSite[]> {
  const files = await walk(API_DIR, ['.ts'])
  const sites: WriteSite[] = []
  // 抓 .from('xxx').insert / .from("xxx").insert（含跨行）
  const re = /\.from\(\s*['"]([a-z_][a-z0-9_]*)['"]\s*\)\s*\.insert\b/gi
  for (const f of files) {
    const text = await readFile(f, 'utf8')
    const lines = text.split('\n')
    lines.forEach((line, idx) => {
      const m = [...line.matchAll(re)]
      for (const match of m) {
        sites.push({
          table: match[1].toLowerCase(),
          file: f,
          line: idx + 1,
          source: 'api',
          context: line.trim().slice(0, 100),
        })
      }
    })
  }
  return sites
}

function group(sites: WriteSite[]): Map<string, { trigger: WriteSite[]; api: WriteSite[] }> {
  const map = new Map<string, { trigger: WriteSite[]; api: WriteSite[] }>()
  for (const s of sites) {
    if (!map.has(s.table)) map.set(s.table, { trigger: [], api: [] })
    const bucket = map.get(s.table)!
    if (s.source === 'trigger') bucket.trigger.push(s)
    else bucket.api.push(s)
  }
  return map
}

async function main() {
  console.log('🔍 audit-write-paths：掃 trigger + API route 對同表的 INSERT...\n')
  const [migSites, apiSites] = await Promise.all([scanMigrations(), scanApi()])
  const grouped = group([...migSites, ...apiSites])

  const collisions: { table: string; trigger: WriteSite[]; api: WriteSite[] }[] = []
  for (const [table, { trigger, api }] of grouped) {
    if (ALLOWLIST.has(table)) continue
    if (trigger.length > 0 && api.length > 0) collisions.push({ table, trigger, api })
  }

  if (collisions.length === 0) {
    console.log('✅ 沒抓到 trigger × API 雙寫撞車風險。\n')
    console.log(
      `   掃了 ${migSites.length} 筆 trigger INSERT、${apiSites.length} 筆 API insert、${grouped.size} 張表。`
    )
    process.exit(0)
  }

  console.log(
    `🔴 抓到 ${collisions.length} 張表有「trigger + API 同時 INSERT」、有 SSOT 撞車風險：\n`
  )
  for (const c of collisions) {
    console.log(`📌 ${c.table}`)
    console.log('   Trigger 寫入：')
    for (const t of c.trigger) {
      console.log(`     - ${t.file}:${t.line}  ${t.context}`)
    }
    console.log('   API 寫入：')
    for (const a of c.api) {
      console.log(`     - ${a.file}:${a.line}  ${a.context}`)
    }
    console.log('')
  }

  console.log('修法選項：')
  console.log('  1. 砍 trigger、靠 API 當 SSOT（API 邏輯通常較彈性）')
  console.log('  2. 砍 API insert、靠 trigger 當 SSOT（trigger 自動跑、無法被忘記）')
  console.log('  3. 改 API 用 ON CONFLICT DO NOTHING 跳過 trigger 已建的列')
  console.log('  4. 確認是「合理雙寫」、加進 ALLOWLIST（要 William 拍板）\n')

  process.exit(1)
}

main().catch(err => {
  console.error('audit-write-paths 自己炸了：', err)
  process.exit(2)
})
