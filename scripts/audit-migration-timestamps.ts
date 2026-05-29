#!/usr/bin/env tsx
/**
 * audit-migration-timestamps.ts — 同 14 位時間戳衝突偵測（B13）
 *
 * 為什麼：
 *   Supabase migration 走檔名 ordering。同 14 位時間戳兩個檔名、
 *   apply 排序退化為字串次序、相依不可靠（B 跑前 A 還沒跑完）。
 *   2026-05-29 盤點：本專案有 29 對 migration 共用完全相同 14 位時間戳。
 *
 * 用法：
 *   npm run audit:migration-timestamps         # 列出所有衝突對、exit 1 若有新衝突
 *   npm run audit:migration-timestamps -- --list-existing  # 含既有衝突清單（不算錯）
 *
 * 行為：
 *   - 掃 supabase/migrations/*.sql（忽略 .skip / _pending_review / _rejected）
 *   - 抽前 14 位（YYYYMMDDHHMMSS）當 key、group 起來
 *   - 多於一個 → 報告
 *   - 新衝突（不在 baseline allowlist）→ exit 1 擋 PR
 *   - 既有衝突已凍結進 baseline、不算錯
 *
 * Baseline：
 *   scripts/audit-migration-timestamps.baseline.json
 *   首次跑會自動生成（ratchet 起點）；之後新檔撞既有戳必須 fail
 */

import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT = join(__dirname, '..')
const MIGRATIONS_DIR = join(ROOT, 'supabase/migrations')
const BASELINE_PATH = join(__dirname, 'audit-migration-timestamps.baseline.json')

const args = process.argv.slice(2)
const listExisting = args.includes('--list-existing')
const writeBaseline = args.includes('--write-baseline')

interface TimestampGroup {
  timestamp: string
  files: string[]
}

function collectMigrationFiles(): string[] {
  if (!existsSync(MIGRATIONS_DIR)) {
    console.error(`✗ 找不到 ${MIGRATIONS_DIR}`)
    process.exit(1)
  }
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql') && !f.endsWith('.skip'))
    .sort()
}

function extractTimestamp(filename: string): string | null {
  const match = filename.match(/^(\d{14})_/)
  return match ? match[1] : null
}

function groupByTimestamp(files: string[]): TimestampGroup[] {
  const map = new Map<string, string[]>()
  for (const f of files) {
    const ts = extractTimestamp(f)
    if (!ts) continue
    if (!map.has(ts)) map.set(ts, [])
    map.get(ts)!.push(f)
  }
  return Array.from(map.entries())
    .filter(([, files]) => files.length > 1)
    .map(([timestamp, files]) => ({ timestamp, files }))
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
}

function loadBaseline(): Set<string> {
  if (!existsSync(BASELINE_PATH)) return new Set()
  try {
    const json = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'))
    return new Set<string>(json.collisions ?? [])
  } catch {
    return new Set()
  }
}

function saveBaseline(timestamps: string[]): void {
  const payload = {
    generated_at: new Date().toISOString(),
    description:
      '同 14 位時間戳衝突 baseline（B13 起 ratchet、新衝突會 fail audit）',
    collisions: timestamps.sort(),
  }
  writeFileSync(BASELINE_PATH, JSON.stringify(payload, null, 2) + '\n', 'utf8')
}

function main() {
  const files = collectMigrationFiles()
  const groups = groupByTimestamp(files)

  console.log(`📁 掃描 ${files.length} 個 migration 檔（${MIGRATIONS_DIR}）`)
  console.log('')

  if (groups.length === 0) {
    console.log('✓ 沒有同戳衝突')
    return
  }

  // 寫 baseline 模式
  if (writeBaseline) {
    saveBaseline(groups.map((g) => g.timestamp))
    console.log(`✓ baseline 已寫入 ${BASELINE_PATH}`)
    console.log(`  凍結 ${groups.length} 個既有同戳衝突`)
    return
  }

  const baseline = loadBaseline()
  const newCollisions = groups.filter((g) => !baseline.has(g.timestamp))
  const existingCollisions = groups.filter((g) => baseline.has(g.timestamp))

  // 既有衝突（baseline 內、僅參考、不擋）
  if (existingCollisions.length > 0 && listExisting) {
    console.log(`📋 既有衝突 ${existingCollisions.length} 對（baseline 已凍、不算錯）：`)
    for (const g of existingCollisions) {
      console.log(`  ${g.timestamp}`)
      for (const f of g.files) console.log(`    - ${f}`)
    }
    console.log('')
  } else if (existingCollisions.length > 0) {
    console.log(
      `📋 既有 ${existingCollisions.length} 對同戳衝突（已 baseline 凍結、加 --list-existing 看清單）`
    )
    console.log('')
  }

  // 新衝突（必擋）
  if (newCollisions.length > 0) {
    console.log(`✗ 發現 ${newCollisions.length} 個新增同戳衝突（需修正）：`)
    console.log('')
    for (const g of newCollisions) {
      console.log(`  時間戳 ${g.timestamp}：`)
      for (const f of g.files) console.log(`    - ${f}`)
    }
    console.log('')
    console.log('修法：')
    console.log('  1. 把新加的 migration 改成不重複的時間戳（往後挪 1 秒）')
    console.log('  2. 確認改完跑 npm run audit:migration-timestamps 通過')
    console.log('')
    process.exit(1)
  }

  // baseline 過時：原本衝突的 migration 被刪、可從 baseline 移除
  const allTimestamps = new Set(groups.map((g) => g.timestamp))
  const stale = Array.from(baseline).filter((ts) => !allTimestamps.has(ts))
  if (stale.length > 0) {
    console.log(`ℹ baseline 有 ${stale.length} 個過時 entry（migration 已不存在）：`)
    for (const ts of stale) console.log(`  - ${ts}`)
    console.log('  跑 npm run audit:migration-timestamps -- --write-baseline 更新')
    console.log('')
  }

  console.log('✓ 沒有新同戳衝突')
}

main()
