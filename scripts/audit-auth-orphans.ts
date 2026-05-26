#!/usr/bin/env node
/**
 * audit-auth-orphans — 偵測 auth.users 裡找不到對應 employees row 的「auth 孤兒」
 *
 * 為什麼存在：
 *   2026-05-17 角落 demo 現場踩到 tenant create rollback 順序錯、auth user 沒清乾淨、
 *   累積成「下次拿同 email 建租戶會被『此 email 已被使用』擋」的隱形地雷。
 *   雖然該 bug 已修（順序改成 employees 先刪 auth user 後刪）、但未來如果有人
 *   寫新的 auth.admin.createUser 流程沒做好 rollback、又會默默累積孤兒。
 *   這隻 script 是定期 check 用、抓住前先警告、不要等 demo 現場才發現。
 *
 * 偵測邏輯：
 *   - SELECT au.id, au.email, au.created_at FROM auth.users au
 *     LEFT JOIN public.employees e ON e.user_id = au.id
 *     WHERE e.id IS NULL
 *
 * 例外（不算孤兒、加進 ALLOWLIST_EMAILS）：
 *   - 平台 service account（暫無、若有未來加）
 *
 * 怎麼跑：
 *   source ~/.config/venturo/secrets.env
 *   npm run audit:orphans        # 只列、不刪
 *   npm run audit:orphans -- --clean   # 互動式逐筆問要不要刪
 *   npm run audit:orphans -- --clean --yes  # 直接清光（CI / 緊急用、危險）
 *
 * Exit code：
 *   0 = 沒孤兒
 *   1 = 找到孤兒（--clean 沒帶就 fail、CI 可以用這擋 PR）
 */

import { createInterface } from 'node:readline/promises'

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF
const TOKEN = process.env.SUPABASE_MCP_AIERP_TOKEN
const MAX_AGE_HOURS_BEFORE_AUTO_FAIL = 24 // 大於這個年紀的孤兒、即使沒帶 --clean 也算 fail

const ALLOWLIST_EMAILS = new Set<string>([
  // 暫無、未來如果有平台 service account 加這裡
])

interface Orphan {
  id: string
  email: string | null
  created_at: string
}

async function runQuery(sql: string): Promise<unknown> {
  if (!PROJECT_REF || !TOKEN) {
    console.error('❌ 缺 env：SUPABASE_PROJECT_REF / SUPABASE_MCP_AIERP_TOKEN')
    console.error('   先跑：source ~/.config/venturo/secrets.env')
    process.exit(2)
  }
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  })
  if (!res.ok) {
    console.error('❌ Management API 回 HTTP', res.status, await res.text())
    process.exit(2)
  }
  return res.json()
}

function ageDescription(createdAt: string): string {
  const now = Date.now()
  const created = new Date(createdAt).getTime()
  const diffMs = now - created
  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  if (hours < 1) {
    const mins = Math.floor(diffMs / (1000 * 60))
    return `${mins} 分鐘前`
  }
  if (hours < 24) return `${hours} 小時前`
  const days = Math.floor(hours / 24)
  return `${days} 天前`
}

async function main() {
  const args = process.argv.slice(2)
  const doClean = args.includes('--clean')
  const skipConfirm = args.includes('--yes') || args.includes('-y')

  console.log('🔍 audit-auth-orphans：掃 auth.users 裡找不到對應 employees row 的孤兒...\n')

  const sql = `
    SELECT au.id, au.email, au.created_at
    FROM auth.users au
    LEFT JOIN public.employees e ON e.user_id = au.id
    WHERE e.id IS NULL
    ORDER BY au.created_at DESC;
  `
  const rows = (await runQuery(sql)) as Orphan[]
  const orphans = rows.filter(r => !r.email || !ALLOWLIST_EMAILS.has(r.email))

  if (orphans.length === 0) {
    console.log('✅ 沒抓到 auth 孤兒、everything is clean。')
    process.exit(0)
  }

  console.log(`🔴 抓到 ${orphans.length} 個 auth 孤兒（auth.users 有但 employees 找不到）：\n`)
  for (const o of orphans) {
    const age = ageDescription(o.created_at)
    console.log(`  ${o.email ?? '(no email)'}  · ${age}  · id=${o.id}`)
  }

  // 判斷是否要自動 fail：年紀超過閾值的、視為「鐵定是 bug 累積」
  const oldOrphans = orphans.filter(o => {
    const ageMs = Date.now() - new Date(o.created_at).getTime()
    return ageMs > MAX_AGE_HOURS_BEFORE_AUTO_FAIL * 60 * 60 * 1000
  })

  if (!doClean) {
    console.log('\n💡 修法選項：')
    console.log('  1. 跑 npm run audit:orphans -- --clean  逐筆問要不要清')
    console.log('  2. 翻 git log 找 auth.admin.createUser 失敗 rollback 漏的 code path、修源頭')
    console.log('  3. 確認是平台 service account、加進 ALLOWLIST_EMAILS')
    if (oldOrphans.length > 0) {
      console.log(
        `\n⚠️ 其中 ${oldOrphans.length} 個年紀超過 ${MAX_AGE_HOURS_BEFORE_AUTO_FAIL}h、強烈建議清掉。`
      )
    }
    process.exit(1)
  }

  // --clean 模式
  console.log('\n🧹 --clean 模式：逐筆問要不要刪 auth user...\n')
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  let deleted = 0
  for (const o of orphans) {
    let confirm = 'y'
    if (!skipConfirm) {
      const ans = await rl.question(
        `刪 ${o.email ?? o.id}（${ageDescription(o.created_at)}）？[y/N] `
      )
      confirm = ans.trim().toLowerCase()
    }
    if (confirm === 'y' || confirm === 'yes') {
      await runQuery(`DELETE FROM auth.users WHERE id = '${o.id}';`)
      console.log(`  ✓ 已刪 ${o.email ?? o.id}`)
      deleted++
    } else {
      console.log(`  ○ 跳過 ${o.email ?? o.id}`)
    }
  }
  rl.close()
  console.log(`\n清完、共刪 ${deleted}/${orphans.length} 個。`)
  process.exit(0)
}

main().catch(err => {
  console.error('audit-auth-orphans 自己炸了：', err)
  process.exit(2)
})
