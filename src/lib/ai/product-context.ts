/**
 * 商品 context — 把客戶上架的商品（ai_products）組成 AI 客服 prompt block
 *
 * 走「組答時全量注入」（William 2026-05-26 拍板）：直接把上架中商品塞 system prompt、
 * 保證 AI 查得到。不走 RAG 抽詞（2026-05-28 William 拍板「白痴起點」、舊 RAG 已拆）。
 *
 * 防爆 prompt：只取上架中（is_active + 未軟刪）+ 在販售期內的商品、上限 MAX_PRODUCTS 筆。
 * 失敗策略：query 失敗 / 無商品 → 回 null、caller 不注入、不擋對話。
 */

import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'
import { getTaipeiToday } from '@/lib/line/date-normalizer'
import type { SupabaseClient } from '@supabase/supabase-js'

const HANDLER = 'product-context'
const MAX_PRODUCTS = 30

interface ProductRow {
  name: string
  contents: string | null
  price: number | null
  currency: string
  description: string | null
  valid_from: string | null
  valid_to: string | null
  validity_note: string | null
}

export async function buildProductBlock(workspaceId: string): Promise<string | null> {
  try {
    const supabase = getSupabaseAdminClient() as unknown as SupabaseClient
    const today = getTaipeiToday().isoDate

    const { data, error } = await supabase
      .from('ai_products')
      .select('name, contents, price, currency, description, valid_from, valid_to, validity_note')
      .eq('workspace_id', workspaceId)
      .eq('is_published', true)
      .eq('is_active', true)
      // 販售期內：起始日未到的不推、結束日已過的不推（null 視為不限）
      .or(`valid_from.is.null,valid_from.lte.${today}`)
      .or(`valid_to.is.null,valid_to.gte.${today}`)
      .order('created_at', { ascending: false })
      .limit(MAX_PRODUCTS)

    if (error) {
      logger.warn(`${HANDLER}: query failed (ignored)`, { error: error.message, workspaceId })
      return null
    }
    if (!data || data.length === 0) return null

    const lines = (data as ProductRow[]).map(formatProduct)
    return (
      `【本店商品 / 加購服務】\n` +
      `以下是本店目前可販售的商品、客戶問到相關項目（價格 / 內容 / 有效期）時、優先用這裡的資料回答、不要編造沒列出的商品：\n\n` +
      `${lines.join('\n\n')}\n\n` +
      `（以上為本店上架商品、若客戶問的商品不在清單、請說「這部分我幫您跟顧問確認」、不要硬掰價格）`
    )
  } catch (err) {
    logger.error(`${HANDLER}: unexpected error`, err, { workspaceId })
    return null
  }
}

function formatProduct(p: ProductRow): string {
  const parts: string[] = [`商品：${p.name}`]
  if (p.contents) parts.push(`內容物：${p.contents}`)
  if (p.price != null) parts.push(`價格：${p.currency} ${p.price.toLocaleString('en-US')}`)
  if (p.description) parts.push(`說明：${p.description}`)
  const period = formatPeriod(p.valid_from, p.valid_to, p.validity_note)
  if (period) parts.push(`販賣期間：${period}`)
  return parts.join('\n')
}

function formatPeriod(from: string | null, to: string | null, note: string | null): string | null {
  const segs: string[] = []
  if (from || to) segs.push(`${from ?? '即日'} ~ ${to ?? '無期限'}`)
  if (note) segs.push(note)
  return segs.length > 0 ? segs.join('、') : null
}
