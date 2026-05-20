/**
 * HAPPY ERP context builder — 把 workspace_ai_settings.data_sources 勾選的
 * 業務資料 query 出來、組成 system prompt block 注入給 LLM。
 *
 * 設計（William 2026-05-20 拍板）：
 *   workspace_ai_settings.data_sources 已有 5 個選項：
 *     tours / hr / customers / shared_data / finance
 *   Phase 1 先實作 tours / hr / customers 三大主力（demo 用夠）、
 *   shared_data / finance 留 Phase 2。
 *
 * 為什麼直接塞 prompt 不走 RAG：
 *   HAPPY 是漫途內部用、員工問題通常涉「我們公司有多少團 / 員工 / 客戶」這
 *   類概覽問題、不需要語意搜尋。直接 LIMIT 30-50 把最近資料塞 prompt 給 LLM
 *   看、足夠回答 80% 內部詢問。
 *
 * 風險：
 *   - prompt 變大、token 略增（每 source ~500-2000 token、3 個 source 加總 ~3000-6000 token）
 *   - 361 個 customers 不能全塞、LIMIT 30 抓最近建立的
 *   - 之後若要查更深需求（譬如「某客戶上次團 X 細節」）要 Phase 2 vector search
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '@/lib/utils/logger'
import { filterActive } from '@/lib/data/filter-active'

const HANDLER = 'happy-erp-context'

// ════════════════════════════════════════
// 公開 API
// ════════════════════════════════════════

export async function buildHappyErpContext(
  supabase: SupabaseClient,
  workspaceId: string,
  dataSources: string[] | null | undefined
): Promise<string | null> {
  if (!dataSources || dataSources.length === 0) return null

  const blocks: string[] = []
  const todayIso = new Date().toISOString().slice(0, 10)

  // 並行 query 三個 source（互不依賴、加速）
  const [toursBlock, hrBlock, customersBlock] = await Promise.all([
    dataSources.includes('tours')     ? fetchToursBlock(supabase, workspaceId)     : Promise.resolve(null),
    dataSources.includes('hr')        ? fetchHrBlock(supabase, workspaceId)        : Promise.resolve(null),
    dataSources.includes('customers') ? fetchCustomersBlock(supabase, workspaceId) : Promise.resolve(null),
  ])

  if (toursBlock) blocks.push(toursBlock)
  if (hrBlock) blocks.push(hrBlock)
  if (customersBlock) blocks.push(customersBlock)

  // 未實作的 source 加標記、讓 LLM 知道「客戶有勾但還沒接」
  const pendingSources: string[] = []
  if (dataSources.includes('shared_data')) pendingSources.push('shared_data（景點/飯店/餐廳）')
  if (dataSources.includes('finance')) pendingSources.push('finance（財務/應收應付）')
  if (pendingSources.length > 0) {
    blocks.push(`【尚未接通的資料源】${pendingSources.join('、')}\n（如果員工問到、請說「這部分還在整合中、預計近期會接上」）`)
  }

  if (blocks.length === 0) return null

  return `【ERP 即時資料（${todayIso} 拉取）】\n以下是公司內部資料庫的真實資料、優先用這些回答員工問題、不要瞎掰：\n\n${blocks.join('\n\n═══════════════════\n\n')}\n\n（資料每次對話即時查、不是 cache）`
}

// ════════════════════════════════════════
// tours：旅遊團
// ════════════════════════════════════════

interface TourRow {
  code: string | null
  name: string | null
  departure_date: string | null
  return_date: string | null
  location: string | null
  status: string | null
  price: number | null
  current_participants: number | null
  max_participants: number | null
}

async function fetchToursBlock(supabase: SupabaseClient, workspaceId: string): Promise<string | null> {
  try {
    const today = new Date().toISOString().slice(0, 10)
    const { data, error } = await supabase
      .from('tours')
      .select('code, name, departure_date, return_date, location, status, price, current_participants, max_participants')
      .eq('workspace_id', workspaceId)
      .eq('archived', false)
      .gte('departure_date', today) // 只看未來/今日及之後出發的團
      .order('departure_date', { ascending: true })
      .limit(30)
      .returns<TourRow[]>()

    if (error) {
      logger.warn(`${HANDLER}: tours query failed`, { error: error.message })
      return null
    }
    if (!data || data.length === 0) {
      return `【旅遊團】目前沒有即將出發的團（今日 ${today} 以後皆無）。`
    }

    const lines = data.map(t => {
      const price = t.price ? `NT$${Number(t.price).toLocaleString('en-US')}/人` : '價格洽詢'
      const seats = `${t.current_participants ?? 0}/${t.max_participants ?? '-'}`
      return `- [${t.code ?? '?'}] ${t.name ?? '(未命名)'} | ${t.location ?? '?'} | ${t.departure_date ?? '?'}→${t.return_date ?? '?'} | ${t.status ?? '?'} | ${price} | ${seats} 人`
    })
    return `【旅遊團（即將/未來出發、共 ${data.length} 個）】\n${lines.join('\n')}`
  } catch (err) {
    logger.warn(`${HANDLER}: tours unexpected error`, { err: err instanceof Error ? err.message : String(err) })
    return null
  }
}

// ════════════════════════════════════════
// hr：員工
// ════════════════════════════════════════

interface EmployeeRow {
  employee_number: string | null
  display_name: string | null
  chinese_name: string | null
  english_name: string | null
  job_title: string | null
  status: string | null
  email: string | null
}

async function fetchHrBlock(supabase: SupabaseClient, workspaceId: string): Promise<string | null> {
  try {
    let q = supabase
      .from('employees')
      .select('employee_number, display_name, chinese_name, english_name, job_title, status, email')
      .eq('workspace_id', workspaceId)
    q = filterActive(q)
    const { data, error } = await q
      .order('employee_number', { ascending: true })
      .limit(50)
      .returns<EmployeeRow[]>()

    if (error) {
      logger.warn(`${HANDLER}: hr query failed`, { error: error.message })
      return null
    }
    if (!data || data.length === 0) return null

    const lines = data.map(e => {
      const name = e.display_name || e.chinese_name || e.english_name || e.email || '?'
      const role = e.job_title || '-'
      const status = e.status || 'active'
      return `- [${e.employee_number ?? '?'}] ${name}（${role}、${status}）`
    })
    return `【員工（在職、共 ${data.length} 人）】\n${lines.join('\n')}`
  } catch (err) {
    logger.warn(`${HANDLER}: hr unexpected error`, { err: err instanceof Error ? err.message : String(err) })
    return null
  }
}

// ════════════════════════════════════════
// customers：客戶
// ════════════════════════════════════════

interface CustomerRow {
  code: string | null
  name: string | null
  phone: string | null
  email: string | null
  company: string | null
}

async function fetchCustomersBlock(supabase: SupabaseClient, workspaceId: string): Promise<string | null> {
  try {
    // 客戶可能很多（361+）、只抓最近建立的 30 個 + 統計總數
    const countQ = filterActive(
      supabase
        .from('customers')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
    )
    const dataQ = filterActive(
      supabase
        .from('customers')
        .select('code, name, phone, email, company')
        .eq('workspace_id', workspaceId)
    )
      .order('created_at', { ascending: false })
      .limit(30)
      .returns<CustomerRow[]>()
    const [{ count }, { data }] = await Promise.all([countQ, dataQ])

    if (!data || data.length === 0) {
      return `【客戶】目前資料庫無客戶資料。`
    }

    const lines = data.map(c => {
      const name = c.name ?? '(未命名)'
      const ext = [c.company, c.phone, c.email].filter(Boolean).join(' / ')
      return `- [${c.code ?? '?'}] ${name}${ext ? `（${ext}）` : ''}`
    })

    const total = count ?? data.length
    return `【客戶（最近建立 ${data.length} 筆、總共 ${total} 位）】\n${lines.join('\n')}\n\n（若員工要查某特定客戶細節超過此清單、引導他到 ERP 系統客戶管理頁面查）`
  } catch (err) {
    logger.warn(`${HANDLER}: customers unexpected error`, { err: err instanceof Error ? err.message : String(err) })
    return null
  }
}
