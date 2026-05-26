#!/usr/bin/env tsx
/**
 * audit:env-vars — 列出 src/ 內所有 process.env 引用
 *
 * 對齊鐵律 #11（API / secret 走 SSOT）：
 *   - 列出所有 env 變數使用、便於對齊 ~/.config/venturo/secrets.env
 *   - 找出未在 INFRASTRUCTURE.md 內文件化的變數
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'fs'
import { join, relative } from 'path'

const ROOT = process.cwd()
const SCAN_DIR = join(ROOT, 'src')

const EXCLUDED = [/node_modules/, /\.next/, /\.test\./, /\.spec\./, /__tests__/]

function walk(dir: string, out: string[] = []): string[] {
  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch {
    return out
  }
  for (const entry of entries) {
    const p = join(dir, entry)
    if (EXCLUDED.some(re => re.test(p))) continue
    let st
    try {
      st = statSync(p)
    } catch {
      continue
    }
    if (st.isDirectory()) walk(p, out)
    else if (entry.match(/\.(ts|tsx|js|jsx)$/)) out.push(p)
  }
  return out
}

function main() {
  const files = walk(SCAN_DIR)
  const usage = new Map<string, string[]>()

  for (const f of files) {
    const src = readFileSync(f, 'utf8')
    const matches = src.matchAll(/process\.env\.([A-Z_][A-Z0-9_]*)/g)
    for (const m of matches) {
      const key = m[1]
      if (!usage.has(key)) usage.set(key, [])
      const rel = relative(ROOT, f)
      if (!usage.get(key)!.includes(rel)) usage.get(key)!.push(rel)
    }
  }

  console.log('')
  console.log('═══ audit:env-vars — process.env 引用統計 ═══')
  console.log('')
  console.log(`掃描檔：${files.length}`)
  console.log(`不重複 env 變數：${usage.size}`)
  console.log('')

  // 排序
  const sorted = Array.from(usage.entries()).sort((a, b) => b[1].length - a[1].length)

  console.log('━━ 用最多的前 20 個 env ━━')
  for (const [key, files] of sorted.slice(0, 20)) {
    console.log(`  ${key} (${files.length} 處)`)
  }
  console.log('')

  console.log('━━ 全部 env 變數清單（按字母排序）━━')
  const alpha = Array.from(usage.keys()).sort()
  for (const key of alpha) {
    console.log(`  ${key}`)
  }
  console.log('')

  // 檢查 INFRASTRUCTURE.md 內是否文件化
  const infraPath = join(process.env.HOME ?? '', '.claude/INFRASTRUCTURE.md')
  if (existsSync(infraPath)) {
    const infra = readFileSync(infraPath, 'utf8')
    const missing = alpha.filter(k => !infra.includes(k))
    if (missing.length > 0) {
      console.log(`━━ 沒在 INFRASTRUCTURE.md 文件化的（${missing.length}）━━`)
      for (const k of missing.slice(0, 30)) {
        console.log(`  ${k}`)
      }
      if (missing.length > 30) console.log(`  ... 還有 ${missing.length - 30}`)
    } else {
      console.log('✅ 全部 env 變數都在 INFRASTRUCTURE.md 文件化')
    }
  } else {
    console.log(`⚠ 找不到 ${infraPath}、跳過文件化檢查`)
  }

  console.log('')
  console.log('💡 對齊鐵律 #11：API / secret 走 ~/.config/venturo/secrets.env SSOT')
}

main()
