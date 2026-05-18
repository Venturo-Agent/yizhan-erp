/**
 * customer_memories audit — 看速記卡狀態（哪些對話該觸發、哪些 fail 卡住、哪些跑成功）
 *
 * 用法：
 *   source ~/.config/venturo/secrets.env
 *   npx tsx scripts/audit-customer-memories.ts
 *
 * 走 service_role 直連（繞 RLS）、列出所有 workspace 的速記卡狀態。
 *
 * 不寫資料、只看資料、可隨時跑。
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ 沒讀到環境變數。先跑：source ~/.config/venturo/secrets.env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const MEMORY_THRESHOLD = 20

async function main(): Promise<void> {
  console.log('🔍 customer_memories audit\n')

  // 1. 列所有速記卡狀態
  const { data: memories, error: memErr } = await supabase
    .from('customer_memories')
    .select(`
      id,
      conversation_id,
      workspace_id,
      customer_id,
      last_summarized_message_count,
      last_summarized_at,
      failed_attempts,
      last_error,
      memory_json,
      updated_at
    `)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })
    .limit(50)

  if (memErr) {
    console.error('讀速記卡失敗：', memErr.message)
    process.exit(1)
  }

  if (!memories || memories.length === 0) {
    console.log('（目前沒有任何速記卡。等 LINE 對話累積 20 則自動觸發。）\n')
  } else {
    console.log(`📋 已建速記卡：${memories.length} 張\n`)

    let okCount = 0
    let failingCount = 0
    let pausedCount = 0
    for (const m of memories) {
      const memoryJson = m.memory_json as { summary_text?: string } | null
      const hasSummary = Boolean(memoryJson?.summary_text)
      const summaryPreview = memoryJson?.summary_text?.slice(0, 60) ?? '(無摘要)'

      let status: string
      if (m.failed_attempts >= 3) {
        status = '🔴 暫停（連續失敗 3 次）'
        pausedCount++
      } else if (m.failed_attempts > 0) {
        status = `🟡 失敗中（${m.failed_attempts} 次）`
        failingCount++
      } else if (hasSummary) {
        status = '🟢 OK'
        okCount++
      } else {
        status = '⚪ 尚未生成'
      }

      console.log(`${status}  conv ${m.conversation_id.slice(0, 8)}`)
      console.log(`     上次摘要到第 ${m.last_summarized_message_count} 則 / ${m.last_summarized_at?.slice(0, 19) ?? '從未'}`)
      console.log(`     摘要：${summaryPreview}`)
      if (m.last_error) console.log(`     ❌ 最近錯誤：${m.last_error.slice(0, 100)}`)
      console.log()
    }

    console.log(`\n統計：🟢 ${okCount} 成功 / 🟡 ${failingCount} 失敗中 / 🔴 ${pausedCount} 暫停\n`)
  }

  // 2. 找「該觸發但還沒觸發」的對話
  // 拉所有對話的訊息計數
  const { data: convs, error: convErr } = await supabase
    .from('inbox_conversations')
    .select('id, workspace_id, display_name, channel_type')
    .eq('is_archived', false)
    .limit(200)

  if (convErr || !convs) {
    console.error('讀對話清單失敗：', convErr?.message)
    return
  }

  console.log('🔍 該觸發但還沒到 20 則的對話：\n')

  let dueCount = 0
  for (const conv of convs.slice(0, 30)) {
    const { count } = await supabase
      .from('inbox_messages')
      .select('id', { count: 'exact', head: true })
      .eq('conversation_id', conv.id)

    const totalMsgs = count ?? 0

    const memory = memories?.find(m => m.conversation_id === conv.id)
    const lastSummarized = memory?.last_summarized_message_count ?? 0
    const diff = totalMsgs - lastSummarized

    if (totalMsgs >= MEMORY_THRESHOLD && diff >= MEMORY_THRESHOLD) {
      console.log(`⏰ ${conv.channel_type}/${conv.display_name ?? '(無名)'} — ${totalMsgs} 則 / 上次摘要到 ${lastSummarized}（差 ${diff}）`)
      dueCount++
    }
  }

  if (dueCount === 0) {
    console.log('   （沒有對話滯後、所有累積 20+ 則的都摘過了）\n')
  } else {
    console.log(`\n⚠️  ${dueCount} 個對話應觸發但尚未跑（可能是 webhook 還沒收到下一則訊息）\n`)
  }

  console.log('✅ audit 完成')
}

main().catch(err => {
  console.error('script 爆了：', err)
  process.exit(1)
})
