#!/usr/bin/env tsx
/**
 * audit:migration-rollback-coverage
 *
 * 檢查 supabase/migrations/*.sql 哪些有 Rollback 註解段（可緊急回滾）。
 *
 * 規則：
 *   - 檔內含 'Rollback' / 'ROLLBACK' 註解 + 對應 SQL 範例 → green
 *   - 純 DROP TABLE / DROP COLUMN with data 沒 Rollback → red（紅線）
 *   - 純 INSERT / UPDATE 沒 Rollback → yellow
 *   - 純 CREATE / ADD COLUMN（DDL 可逆）沒 Rollback → green（合理省略）
 *
 * 從某個 cutoff 日期之後的 migration 強制要求 Rollback。
 */

import { readFileSync, readdirSync } from 'fs'
import { join, relative } from 'path'

const ROOT = process.cwd()
const MIGRATION_DIR = join(ROOT, 'supabase/migrations')

// 從這日期之後的 migration 強制要 Rollback
const ROLLBACK_REQUIRED_FROM = '20260515'

interface MigrationInfo {
  file: string
  date: string
  hasRollback: boolean
  riskLevel: 'critical' | 'warn' | 'safe'
  riskReason?: string
}

const RISK_PATTERNS: Array<{ pattern: RegExp; level: 'critical' | 'warn'; reason: string }> = [
  { pattern: /DROP\s+TABLE/i, level: 'critical', reason: 'DROP TABLE 不可逆' },
  { pattern: /DROP\s+COLUMN/i, level: 'critical', reason: 'DROP COLUMN 含資料' },
  {
    pattern: /ALTER\s+COLUMN.*TYPE/i,
    level: 'critical',
    reason: 'ALTER TYPE 可能 silent truncate',
  },
  { pattern: /TRUNCATE/i, level: 'critical', reason: 'TRUNCATE 砍資料' },
  { pattern: /DELETE\s+FROM/i, level: 'warn', reason: 'DELETE 砍 row' },
  { pattern: /UPDATE\s+.*\bSET\b/i, level: 'warn', reason: 'UPDATE 改值' },
]

function classifyRisk(src: string): { level: 'critical' | 'warn' | 'safe'; reason?: string } {
  for (const { pattern, level, reason } of RISK_PATTERNS) {
    if (pattern.test(src)) return { level, reason }
  }
  return { level: 'safe' }
}

function hasRollback(src: string): boolean {
  return /[Rr][Oo][Ll][Ll][Bb][Aa][Cc][Kk]/.test(src)
}

function main() {
  const files = readdirSync(MIGRATION_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort()

  const all: MigrationInfo[] = []
  for (const f of files) {
    const src = readFileSync(join(MIGRATION_DIR, f), 'utf8')
    const date = f.slice(0, 8)
    const risk = classifyRisk(src)
    all.push({
      file: f,
      date,
      hasRollback: hasRollback(src),
      riskLevel: risk.level,
      riskReason: risk.reason,
    })
  }

  // 統計
  const total = all.length
  const withRollback = all.filter(m => m.hasRollback).length
  const critical = all.filter(m => m.riskLevel === 'critical')
  const criticalNoRollback = critical.filter(m => !m.hasRollback)
  const recent = all.filter(m => m.date >= ROLLBACK_REQUIRED_FROM)
  const recentNoRollback = recent.filter(m => !m.hasRollback)

  console.log('')
  console.log('═══ audit:migration-rollback-coverage ═══')
  console.log('')
  console.log(`migration 總數：${total}`)
  console.log(`含 Rollback 註解：${withRollback}`)
  console.log(`覆蓋率：${((withRollback / total) * 100).toFixed(1)}%`)
  console.log('')
  console.log(`Critical risk migration：${critical.length} 個`)
  console.log(`其中沒 Rollback：${criticalNoRollback.length} 個（紅線）`)
  console.log('')
  console.log(`Recent migration（${ROLLBACK_REQUIRED_FROM}+）：${recent.length} 個`)
  console.log(`其中沒 Rollback：${recentNoRollback.length} 個`)
  console.log(
    `Recent 覆蓋率：${recent.length > 0 ? (((recent.length - recentNoRollback.length) / recent.length) * 100).toFixed(1) : 'N/A'}%`
  )
  console.log('')

  if (criticalNoRollback.length > 0) {
    console.log('━━ 🚨 Critical 沒 Rollback（紅線、要補）━━')
    for (const m of criticalNoRollback.slice(0, 15)) {
      console.log(`  ${m.file}  [${m.riskReason}]`)
    }
    if (criticalNoRollback.length > 15) {
      console.log(`  ... 還有 ${criticalNoRollback.length - 15} 個`)
    }
    console.log('')
  }

  if (recentNoRollback.length > 0) {
    console.log(`━━ ⚠ Recent（${ROLLBACK_REQUIRED_FROM}+）沒 Rollback（之後不該再有）━━`)
    for (const m of recentNoRollback.slice(0, 10)) {
      console.log(`  ${m.file}  [${m.riskLevel}${m.riskReason ? ': ' + m.riskReason : ''}]`)
    }
    if (recentNoRollback.length > 10) {
      console.log(`  ... 還有 ${recentNoRollback.length - 10} 個`)
    }
    console.log('')
  }

  console.log('💡 修法：在 migration 結尾加：')
  console.log('   -- ════ Rollback ════')
  console.log('   -- BEGIN;')
  console.log('   -- ALTER TABLE ... DROP COLUMN IF EXISTS ...;')
  console.log('   -- COMMIT;')

  if (criticalNoRollback.length > 0) process.exit(1)
}

main()
