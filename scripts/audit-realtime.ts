#!/usr/bin/env tsx
/**
 * audit-realtime.ts — entity hook vs Supabase realtime publication 差集偵測
 *
 * 用法：
 *   npm run audit:realtime               # code grep only（不需 DB 連線）
 *   npm run audit:realtime -- --db       # 加上 DB publication 比對（需 SUPABASE_DB_URL）
 *
 * 問題：
 *   createEntityHook(tableName) 內建 useRealtimeSync()、會訂閱 postgres_changes。
 *   但 Supabase 只推送有加進 publication 的 table。
 *   若 entity hook 訂閱了 X、但 X 沒在 publication → realtime 靜默失效。
 *
 * 輸出：
 *   - 所有 entity hook 使用的 table 列表
 *   - （--db 模式）publication 有但 entity hook 沒訂閱的 table
 *   - （--db 模式）entity hook 訂閱但 publication 沒有的 table
 */

import { execSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT = join(__dirname, '..')
const ENTITIES_DIR = join(ROOT, 'src/data/entities')
const useDb = process.argv.includes('--db')

// ─────────────────────────────────────────────
// 1. 掃 src/data/entities/*.ts 找所有 createEntityHook('tableName') 呼叫
// ─────────────────────────────────────────────
function scanEntityTables(): string[] {
  const files = readdirSync(ENTITIES_DIR).filter(f => f.endsWith('.ts') && !f.endsWith('.d.ts'))
  const tables: string[] = []
  for (const file of files) {
    const content = readFileSync(join(ENTITIES_DIR, file), 'utf-8')
    // 匹配 createEntityHook<T>('tableName' 或 createEntityHook('tableName'
    const matches = content.matchAll(/createEntityHook(?:<[^>]+>)?\(\s*['"`]([^'"`]+)['"`]/g)
    for (const m of matches) {
      if (!tables.includes(m[1])) tables.push(m[1])
    }
  }
  return tables.sort()
}

// ─────────────────────────────────────────────
// 2. 查 DB publication（需 SUPABASE_DB_URL）
// ─────────────────────────────────────────────
function fetchPublicationTables(): string[] | null {
  const dbUrl = process.env.SUPABASE_DB_URL
  if (!dbUrl) {
    console.log('  ⚠️  SUPABASE_DB_URL 未設定，跳過 DB publication 比對')
    console.log('     需要先 source ~/.config/venturo/secrets.env')
    return null
  }
  try {
    const result = execSync(
      `psql "${dbUrl}" -t -A -c "SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime' ORDER BY tablename;"`,
      { timeout: 10_000, stdio: ['pipe', 'pipe', 'pipe'] }
    ).toString()
    return result
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean)
      .sort()
  } catch (err) {
    console.log('  ⚠️  無法查詢 DB（Mac IPv6 或連線問題）、跳過 publication 比對')
    return null
  }
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────
console.log('\n🔍 audit:realtime — entity hook vs Supabase realtime publication\n')

const entityTables = scanEntityTables()
console.log(`📦 Entity hooks 訂閱的 tables (${entityTables.length}):`)
for (const t of entityTables) console.log(`   ${t}`)

if (!useDb) {
  console.log('\n💡 加 --db 旗標並設定 SUPABASE_DB_URL 可進行 publication 比對')
  console.log('   npm run audit:realtime -- --db\n')
  process.exit(0)
}

const pubTables = fetchPublicationTables()
if (!pubTables) {
  process.exit(0)
}

console.log(`\n📡 supabase_realtime publication tables (${pubTables.length}):`)
for (const t of pubTables) console.log(`   ${t}`)

const entitySet = new Set(entityTables)
const pubSet = new Set(pubTables)

const missingFromPub = entityTables.filter(t => !pubSet.has(t))
const missingFromEntity = pubTables.filter(t => !entitySet.has(t))

let hasError = false

if (missingFromPub.length > 0) {
  hasError = true
  console.log(`\n❌ entity hook 訂閱但 publication 沒有的 tables（realtime 靜默失效）:`)
  for (const t of missingFromPub) {
    console.log(`   ${t}  ← 需加進 publication 或確認不需 realtime`)
  }
} else {
  console.log('\n✅ 所有 entity hook 訂閱的 table 都在 publication')
}

if (missingFromEntity.length > 0) {
  console.log(`\n⚠️  publication 有但 entity hook 沒訂閱的 tables（不是錯誤、只是提示）:`)
  for (const t of missingFromEntity) {
    console.log(`   ${t}`)
  }
}

console.log()
process.exit(hasError ? 1 : 0)
