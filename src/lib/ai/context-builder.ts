/**
 * AI Brain context builder（M9）
 *
 * 給 generateBotReply 的 extraSystemContext 參數補資料：
 *   - 客戶資料（如果對話 thread 已綁定 customers row）
 *   - 客戶最近訂單（簡短描述、最近 3 筆）
 *   - workspace 可推薦的旅遊團（最近 / 銷售中、最多 5 筆）
 *
 * 設計：失敗時靜默回空字串、不阻塞 AI 回覆。
 *      AI brain 拿到的 context 越完整、答得越貼題。
 */

import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { filterActive } from '@/lib/data/filter-active'
import { logger } from '@/lib/utils/logger'
import { formatDateTaipei } from '@/lib/utils/format-date'
import type { MemoryJson } from './memory-summarizer'

interface TourRow {
  code: string | null
  name: string | null
  location: string | null
  departure_date: string | null
  return_date: string | null
  price: number | null
  status: string | null
}

interface ConversationRow {
  customer_id: string | null
}

interface CustomerRow {
  id: string
  name: string | null
  phone: string | null
  email: string | null
}

interface OrderRow {
  order_number: string | null
  status: string | null
  total_amount: number | null
  tour_id: string | null
}

interface MemoryRow {
  memory_json: MemoryJson | null
  last_summarized_at: string | null
}

/**
 * 組對話 thread 的 context string、塞進 system prompt。
 *
 * 順序（從「最個人」到「最通用」）：
 *   1. 客戶速記卡（長期記憶、AI 每 50 則訊息自己重寫）
 *   2. workspace 可推薦的團
 *   3. 綁定的 ERP 客戶 + 最近訂單
 */
export async function buildConversationContext(
  conversationId: string,
  workspaceId: string
): Promise<string> {
  const parts: string[] = []

  // 1. 客戶速記卡（long-term memory、ai-brain 只看最近 10 則、靠這個記住更早講過的事）
  try {
    const supabase = getSupabaseAdminClient()
    const memoryQuery = supabase
      .from('customer_memories')
      .select('memory_json, last_summarized_at')
      .eq('conversation_id', conversationId)
    const { data: memory } = await filterActive(memoryQuery).maybeSingle<MemoryRow>()

    if (memory?.memory_json) {
      const m = memory.memory_json
      const memoryLines: string[] = []

      if (m.summary_text) {
        memoryLines.push(`📋 ${m.summary_text}`)
      }

      const pref = m.preferences
      if (pref) {
        if (pref.avoid && pref.avoid.length > 0) {
          memoryLines.push(`⚠️ 客戶明確不要 / 避忌：${pref.avoid.join('、')}`)
        }
        if (pref.budget_range) {
          memoryLines.push(`💰 預算：${pref.budget_range}`)
        }
        if (pref.destinations && pref.destinations.length > 0) {
          memoryLines.push(`✈️ 想去：${pref.destinations.join('、')}`)
        }
        if (pref.special_needs && pref.special_needs.length > 0) {
          memoryLines.push(`🔍 特殊需求：${pref.special_needs.join('、')}`)
        }
      }

      const hist = m.history
      if (hist?.rejected && hist.rejected.length > 0) {
        const rej = hist.rejected.map(r => `${r.tour}（${r.reason}）`).join('、')
        memoryLines.push(`🚫 已拒絕過的團：${rej}`)
      }
      if (hist?.interested && hist.interested.length > 0) {
        memoryLines.push(`👍 感興趣的團：${hist.interested.join('、')}`)
      }

      if (memoryLines.length > 0) {
        parts.push(`【客戶速記卡】（上次更新：${memory.last_summarized_at ?? '剛建立'}）\n${memoryLines.join('\n')}`)
      }
    }
  } catch (error) {
    logger.debug('buildConversationContext: memory lookup failed', { error })
  }

  // 2. workspace 可推薦的團
  try {
    const supabase = getSupabaseAdminClient()
    const { data: tours } = await supabase
      .from('tours')
      .select('code, name, location, departure_date, return_date, price, status')
      .eq('workspace_id', workspaceId)
      .in('status', ['planning', 'open', 'confirmed'])
      .gte('departure_date', formatDateTaipei(new Date()))
      .order('departure_date', { ascending: true })
      .limit(5)

    if (tours && tours.length > 0) {
      const lines = (tours as TourRow[]).map(t => {
        const dateRange =
          t.departure_date && t.return_date ? `${t.departure_date}~${t.return_date}` : '日期待定'
        const priceTxt =
          t.price && t.price > 0 ? `NT$${Math.round(t.price).toLocaleString()}` : '價格洽詢'
        return `- ${t.code || ''} ${t.name || ''}（${t.location || ''}、${dateRange}、${priceTxt}）`
      })
      parts.push(`可推薦的旅遊團（最近 5 個）：\n${lines.join('\n')}`)
    }
  } catch (error) {
    logger.debug('buildConversationContext: tours lookup failed', { error })
  }

  // 2. 對話 thread 綁定的客戶資料 + 最近訂單
  try {
    const supabase = getSupabaseAdminClient()
    const convTable = supabase.from as unknown as (
      table: string
    ) => {
      select: (cols: string) => {
        eq: (col: string, value: string) => {
          maybeSingle: () => Promise<{
            data: ConversationRow | null
            error: { message: string } | null
          }>
        }
      }
    }
    const { data: conv } = await convTable('inbox_conversations')
      .select('customer_id')
      .eq('id', conversationId)
      .maybeSingle()

    if (conv?.customer_id) {
      const { data: customer } = await supabase
        .from('customers')
        .select('id, name, phone, email')
        .eq('id', conv.customer_id)
        .maybeSingle<CustomerRow>()

      if (customer) {
        parts.push(
          `已綁定客戶：${customer.name || '未填名'}（電話 ${customer.phone || '未填'}、email ${customer.email || '未填'}）`
        )

        // 最近 3 筆訂單
        const { data: orders } = await supabase
          .from('orders')
          .select('order_number, status, total_amount, tour_id')
          .eq('workspace_id', workspaceId)
          .eq('customer_id', customer.id)
          .order('created_at', { ascending: false })
          .limit(3)

        if (orders && orders.length > 0) {
          const orderLines = (orders as unknown as OrderRow[]).map(o => {
            const amt =
              o.total_amount && o.total_amount > 0
                ? `NT$${Math.round(o.total_amount).toLocaleString()}`
                : '未計價'
            return `- 訂單 ${o.order_number || ''}（${o.status || '未知狀態'}、${amt}）`
          })
          parts.push(`客戶最近訂單：\n${orderLines.join('\n')}`)
        }
      }
    } else {
      parts.push('這位客戶尚未綁定 ERP 客戶資料（agent 後台可手動綁定、之後對話會帶歷史 context）')
    }
  } catch (error) {
    logger.debug('buildConversationContext: customer/orders lookup failed', { error })
  }

  return parts.length > 0 ? parts.join('\n\n') : ''
}
