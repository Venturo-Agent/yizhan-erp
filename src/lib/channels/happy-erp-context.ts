/**
 * HAPPY ERP context builder — 把 workspace_ai_settings.data_sources 勾選的
 * 業務資料 query 出來、組成 system prompt block 注入給 LLM。
 *
 * 設計（William 2026-05-20 拍板）：
 *   workspace_ai_settings.data_sources 6 個選項：
 *     tours / hr / customers / suppliers / finance / shared_data
 *   全 6 個 source 都已實作（2026-05-20 補齊 suppliers / finance / shared_data）。
 *
 * 為什麼直接塞 prompt 不走 RAG：
 *   HAPPY 是漫途內部用、員工問題通常涉「我們公司有多少團 / 員工 / 客戶」這
 *   類概覽問題、不需要語意搜尋。直接 LIMIT 30-50 把最近資料塞 prompt 給 LLM
 *   看、足夠回答 80% 內部詢問。
 *
 * 風險：
 *   - prompt 變大、token 略增（每 source ~500-2000 token、6 個 source 加總 ~5000-10000 token）
 *   - 361 個 customers 不能全塞、LIMIT 30 抓最近建立的
 *   - 之後若要查更深需求（譬如「某客戶上次團 X 細節」）要 Phase 2 vector search
 *
 * RLS 紀律：
 *   - 所有 query 走 caller 傳進來的 supabase client（user-scoped RLS）、不用 admin client
 *   - workspace-scoped 表必 .eq('workspace_id', workspaceId)
 *   - 共用表（attractions / hotels / restaurants）DB 沒 workspace_id、靠 RLS 自己擋
 *   - 軟刪除：有 deleted_at 的走 filterActive、suppliers 只有 is_active（地方法律 #3）
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

  // 並行 query 6 個 source（互不依賴、加速）
  const [toursBlock, hrBlock, customersBlock, suppliersBlock, financeBlock, sharedDataBlock] =
    await Promise.all([
      dataSources.includes('tours')
        ? fetchToursBlock(supabase, workspaceId)
        : Promise.resolve(null),
      dataSources.includes('hr') ? fetchHrBlock(supabase, workspaceId) : Promise.resolve(null),
      dataSources.includes('customers')
        ? fetchCustomersBlock(supabase, workspaceId)
        : Promise.resolve(null),
      dataSources.includes('suppliers')
        ? fetchSuppliersBlock(supabase, workspaceId)
        : Promise.resolve(null),
      dataSources.includes('finance')
        ? fetchFinanceBlock(supabase, workspaceId)
        : Promise.resolve(null),
      dataSources.includes('shared_data')
        ? fetchSharedDataBlock(supabase, workspaceId)
        : Promise.resolve(null),
    ])

  if (toursBlock) blocks.push(toursBlock)
  if (hrBlock) blocks.push(hrBlock)
  if (customersBlock) blocks.push(customersBlock)
  if (suppliersBlock) blocks.push(suppliersBlock)
  if (financeBlock) blocks.push(financeBlock)
  if (sharedDataBlock) blocks.push(sharedDataBlock)

  // 未實作的 source 加標記、讓 LLM 知道「客戶有勾但還沒接」
  // （目前 6 個 source 全部實作完、此清單保留給未來新加的 source 用）
  const IMPLEMENTED_SOURCES = new Set([
    'tours',
    'hr',
    'customers',
    'suppliers',
    'finance',
    'shared_data',
  ])
  const pendingSources = dataSources.filter(s => !IMPLEMENTED_SOURCES.has(s))
  if (pendingSources.length > 0) {
    blocks.push(
      `【尚未接通的資料源】${pendingSources.join('、')}\n（如果員工問到、請說「這部分還在整合中、預計近期會接上」）`
    )
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

async function fetchToursBlock(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<string | null> {
  try {
    const today = new Date().toISOString().slice(0, 10)
    const { data, error } = await supabase
      .from('tours')
      .select(
        'code, name, departure_date, return_date, location, status, price, current_participants, max_participants'
      )
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
      const price = t.price ? `${Number(t.price).toLocaleString('en-US')}/人` : '價格洽詢'
      const seats = `${t.current_participants ?? 0}/${t.max_participants ?? '-'}`
      return `- [${t.code ?? '?'}] ${t.name ?? '(未命名)'} | ${t.location ?? '?'} | ${t.departure_date ?? '?'}→${t.return_date ?? '?'} | ${t.status ?? '?'} | ${price} | ${seats} 人`
    })
    return `【旅遊團（即將/未來出發、共 ${data.length} 個）】\n${lines.join('\n')}`
  } catch (err) {
    logger.warn(`${HANDLER}: tours unexpected error`, {
      err: err instanceof Error ? err.message : String(err),
    })
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
    logger.warn(`${HANDLER}: hr unexpected error`, {
      err: err instanceof Error ? err.message : String(err),
    })
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

async function fetchCustomersBlock(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<string | null> {
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
    logger.warn(`${HANDLER}: customers unexpected error`, {
      err: err instanceof Error ? err.message : String(err),
    })
    return null
  }
}

// ════════════════════════════════════════
// suppliers：供應商
// ════════════════════════════════════════

interface SupplierRow {
  code: string | null
  name: string | null
  short_name: string | null
  supplier_type_code: string | null
  contact_person: string | null
  phone: string | null
  mobile: string | null
  email: string | null
  country: string | null
  city: string | null
}

async function fetchSuppliersBlock(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<string | null> {
  try {
    // 供應商表沒有 deleted_at、軟刪除走 is_active=false（地方法律 #3）、不能用 filterActive
    const { data, error, count } = await supabase
      .from('suppliers')
      .select(
        'code, name, short_name, supplier_type_code, contact_person, phone, mobile, email, country, city',
        { count: 'exact' }
      )
      .eq('workspace_id', workspaceId)
      .eq('is_active', true)
      .order('code', { ascending: true })
      .limit(50)
      .returns<SupplierRow[]>()

    if (error) {
      logger.warn(`${HANDLER}: suppliers query failed`, { error: error.message })
      return null
    }
    if (!data || data.length === 0) {
      return `【供應商】目前資料庫無供應商資料。`
    }

    const lines = data.map(s => {
      const name = s.short_name || s.name || '(未命名)'
      const type = s.supplier_type_code ? `[${s.supplier_type_code}]` : ''
      const region = [s.country, s.city].filter(Boolean).join('/')
      const contact = [s.contact_person, s.phone || s.mobile, s.email].filter(Boolean).join(' / ')
      const tail = [region, contact].filter(Boolean).join('｜')
      return `- [${s.code ?? '?'}]${type} ${name}${tail ? `（${tail}）` : ''}`
    })

    const total = count ?? data.length
    return `【供應商（共 ${total} 家、顯示前 ${data.length} 家）】\n${lines.join('\n')}`
  } catch (err) {
    logger.warn(`${HANDLER}: suppliers unexpected error`, {
      err: err instanceof Error ? err.message : String(err),
    })
    return null
  }
}

// ════════════════════════════════════════
// finance：財務概覽（應收/應付/本月實收實支）
// ════════════════════════════════════════
//
// 4 項摘要（每項是 1 筆 query、平行跑）：
//   1. 應收未收：receipts.status='pending'  SUM(receipt_amount) / COUNT
//   2. 應付未付：payment_requests.status='pending' SUM(amount) / COUNT
//   3. 本月實收：receipts.status='confirmed' AND receipt_date 在本月 SUM / COUNT
//   4. 本月實支：disbursement_orders.status='paid' AND disbursement_date 在本月 SUM / COUNT
//
// receipts 軟刪除走 deleted_at（也用 is_active 雙保險、紅線「軟刪除統一 is_active=false」）
// payment_requests / disbursement_orders 都有 deleted_at、走 filterActive

interface AmountSummary {
  total: number
  count: number
}

function monthRange(now: Date): { start: string; end: string } {
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  }
}

function fmtNT(amount: number): string {
  return `${Math.round(amount).toLocaleString('en-US')}`
}

function summarize(
  rows: Array<Record<string, unknown>> | null,
  count: number | null,
  amountColumn: string
): AmountSummary {
  const list = rows ?? []
  const total = list.reduce((acc, r) => acc + (Number(r[amountColumn]) || 0), 0)
  return { total, count: count ?? list.length }
}

async function fetchFinanceBlock(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<string | null> {
  try {
    const now = new Date()
    const { start: monthStart, end: monthEnd } = monthRange(now)

    // 4 個 query 平行跑。PostgREST 不支援 SUM、所以 select amount 欄位 + client 端加總；
    // limit 5000 已遠超實際 pending / 本月 row 數、不會漏算。
    const arUnsettledQ = filterActive(
      supabase
        .from('receipts')
        .select('receipt_amount', { count: 'exact' })
        .eq('workspace_id', workspaceId)
    )
      .eq('status', 'pending')
      .eq('is_active', true)
      .limit(5000)

    const apUnpaidQ = filterActive(
      supabase
        .from('payment_requests')
        .select('amount', { count: 'exact' })
        .eq('workspace_id', workspaceId)
    )
      .eq('status', 'pending')
      .limit(5000)

    const monthReceivedQ = filterActive(
      supabase
        .from('receipts')
        .select('receipt_amount', { count: 'exact' })
        .eq('workspace_id', workspaceId)
    )
      .eq('status', 'confirmed')
      .eq('is_active', true)
      .gte('receipt_date', monthStart)
      .lt('receipt_date', monthEnd)
      .limit(5000)

    const monthPaidQ = filterActive(
      supabase
        .from('disbursement_orders')
        .select('amount', { count: 'exact' })
        .eq('workspace_id', workspaceId)
    )
      .eq('status', 'paid')
      .gte('disbursement_date', monthStart)
      .lt('disbursement_date', monthEnd)
      .limit(5000)

    const [arRes, apRes, monthRecvRes, monthPaidRes] = await Promise.all([
      arUnsettledQ,
      apUnpaidQ,
      monthReceivedQ,
      monthPaidQ,
    ])

    if (arRes.error)
      logger.warn(`${HANDLER}: finance receipts(pending) failed`, { error: arRes.error.message })
    if (apRes.error)
      logger.warn(`${HANDLER}: finance payment_requests(pending) failed`, {
        error: apRes.error.message,
      })
    if (monthRecvRes.error)
      logger.warn(`${HANDLER}: finance receipts(month) failed`, {
        error: monthRecvRes.error.message,
      })
    if (monthPaidRes.error)
      logger.warn(`${HANDLER}: finance disbursement_orders(month) failed`, {
        error: monthPaidRes.error.message,
      })

    const arUnsettled = arRes.error
      ? null
      : summarize(
          arRes.data as Array<Record<string, unknown>> | null,
          arRes.count,
          'receipt_amount'
        )
    const apUnpaid = apRes.error
      ? null
      : summarize(apRes.data as Array<Record<string, unknown>> | null, apRes.count, 'amount')
    const monthReceived = monthRecvRes.error
      ? null
      : summarize(
          monthRecvRes.data as Array<Record<string, unknown>> | null,
          monthRecvRes.count,
          'receipt_amount'
        )
    const monthPaid = monthPaidRes.error
      ? null
      : summarize(
          monthPaidRes.data as Array<Record<string, unknown>> | null,
          monthPaidRes.count,
          'amount'
        )

    const lines: string[] = []
    if (arUnsettled && arUnsettled.count > 0) {
      lines.push(
        `- 應收未收：${fmtNT(arUnsettled.total)} / 共 ${arUnsettled.count} 筆（客戶已建單但款項尚未確認入帳）`
      )
    }
    if (apUnpaid && apUnpaid.count > 0) {
      lines.push(
        `- 應付未付：${fmtNT(apUnpaid.total)} / 共 ${apUnpaid.count} 筆（供應商已請款但尚未付款）`
      )
    }
    if (monthReceived && monthReceived.count > 0) {
      lines.push(
        `- 本月實收（${monthStart} 起）：${fmtNT(monthReceived.total)} / 共 ${monthReceived.count} 筆`
      )
    }
    if (monthPaid && monthPaid.count > 0) {
      lines.push(
        `- 本月實支（${monthStart} 起）：${fmtNT(monthPaid.total)} / 共 ${monthPaid.count} 筆`
      )
    }

    if (lines.length === 0) {
      return `【財務概覽】本月暫無收支紀錄、亦無未結的應收應付。`
    }

    return `【財務概覽】\n${lines.join('\n')}\n\n（金額僅供概覽；明細請到 ERP 財務管理 → 收款/請款/出納 頁查）`
  } catch (err) {
    logger.warn(`${HANDLER}: finance unexpected error`, {
      err: err instanceof Error ? err.message : String(err),
    })
    return null
  }
}

// ════════════════════════════════════════
// shared_data：景點/飯店/餐廳庫（平台共用 reference data、不 scoped by workspace_id）
// ════════════════════════════════════════
//
// 三個表 DB 都沒 workspace_id、RLS 自己擋（漫途共用庫所有 workspace 可讀）。
// 每個表：count + 最近更新的 10 筆名字（沒 last_used_at、用 updated_at 當「最近活動」）。

interface SharedItemRow {
  name: string | null
  english_name?: string | null
  country_id?: string | null
  city_id?: string | null
}

async function fetchOneSharedSlice(
  supabase: SupabaseClient,
  table: 'attractions' | 'hotels' | 'restaurants'
): Promise<{ count: number; recent: string[] } | null> {
  try {
    // count + 最近 10 筆並行（共用表 RLS 自己擋、不加 workspace_id filter）
    const countQ = filterActive(
      supabase.from(table).select('id', { count: 'exact', head: true }).eq('is_active', true)
    )
    const dataQ = filterActive(
      supabase.from(table).select('name, english_name, country_id, city_id').eq('is_active', true)
    )
      .order('updated_at', { ascending: false, nullsFirst: false })
      .limit(10)
      .returns<SharedItemRow[]>()

    const [{ count, error: countErr }, { data, error: dataErr }] = await Promise.all([
      countQ,
      dataQ,
    ])
    if (countErr) {
      logger.warn(`${HANDLER}: shared_data ${table} count failed`, { error: countErr.message })
      return null
    }
    if (dataErr) {
      logger.warn(`${HANDLER}: shared_data ${table} list failed`, { error: dataErr.message })
      return null
    }
    const recent = (data ?? [])
      .map(r => {
        const name = r.name || r.english_name || '?'
        const loc = [r.country_id, r.city_id].filter(Boolean).join('/')
        return loc ? `${name}（${loc}）` : name
      })
      .filter(Boolean)
    return { count: count ?? recent.length, recent }
  } catch (err) {
    logger.warn(`${HANDLER}: shared_data ${table} unexpected error`, {
      err: err instanceof Error ? err.message : String(err),
    })
    return null
  }
}

async function fetchSharedDataBlock(
  supabase: SupabaseClient,
  _workspaceId: string
): Promise<string | null> {
  try {
    const [attractions, hotels, restaurants] = await Promise.all([
      fetchOneSharedSlice(supabase, 'attractions'),
      fetchOneSharedSlice(supabase, 'hotels'),
      fetchOneSharedSlice(supabase, 'restaurants'),
    ])

    const lines: string[] = []
    if (attractions) {
      const sample =
        attractions.recent.length > 0
          ? `、最近更新：${attractions.recent.slice(0, 5).join('、')}`
          : ''
      lines.push(`- 景點庫共 ${attractions.count} 筆${sample}`)
    }
    if (hotels) {
      const sample =
        hotels.recent.length > 0 ? `、最近更新：${hotels.recent.slice(0, 5).join('、')}` : ''
      lines.push(`- 飯店庫共 ${hotels.count} 筆${sample}`)
    }
    if (restaurants) {
      const sample =
        restaurants.recent.length > 0
          ? `、最近更新：${restaurants.recent.slice(0, 5).join('、')}`
          : ''
      lines.push(`- 餐廳庫共 ${restaurants.count} 筆${sample}`)
    }

    if (lines.length === 0) return null
    return `【共用資料（景點 / 飯店 / 餐廳庫）】\n${lines.join('\n')}\n\n（這些是漫途累積的旅遊基礎資料、可在 ERP 資源庫頁面查詳細）`
  } catch (err) {
    logger.warn(`${HANDLER}: shared_data unexpected error`, {
      err: err instanceof Error ? err.message : String(err),
    })
    return null
  }
}
