/**
 * LINE Bot ERP bridge — Tour 搜尋 + 建單
 *
 * 從 erp-bridge.ts 抽出：botSearchTours / botGetTourDetails / botCreateOrder
 */

import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'
import { formatDateTaipei } from '@/lib/utils/format-date'
import { filterActive } from '@/lib/data/filter-active'
import type {
  BotContext,
  BotCreateOrderInput,
  OrderRow,
  TourRow,
  TourSearchFilters,
  TourSummary,
} from '@/types/line.types'
import {
  assertCanRead,
  assertCanWrite,
  writeAuditLog,
  clamp,
  HANDLER,
  SAFETY,
  DEFAULT_TOUR_SEARCH_LIMIT,
} from '@/lib/line/erp-bridge-internal'

// ============================================================================
// Tour 搜尋（KB Tier 1）
// ============================================================================

/**
 * 找團（target_date ± N 天）
 *
 * - 只回 active / 非 deleted / 非 archived
 * - 預設 ±7 天、上限 ±14 天
 * - 回 TourSummary（精簡欄位、不把 100 個欄位塞 LLM context）
 */
export async function botSearchTours(
  ctx: BotContext,
  filters: TourSearchFilters
): Promise<TourSummary[]> {
  assertCanRead(ctx, 'botSearchTours')

  const supabase = getSupabaseAdminClient()

  const daysBefore = clamp(filters.daysBefore ?? 7, 0, 14)
  const daysAfter = clamp(filters.daysAfter ?? 7, 0, 14)
  const limit = clamp(filters.limit ?? DEFAULT_TOUR_SEARCH_LIMIT, 1, SAFETY.TOUR_SEARCH_HARD_LIMIT)

  const target = new Date(`${filters.targetDate}T00:00:00Z`)
  if (Number.isNaN(target.getTime())) {
    throw new Error(`invalid targetDate: ${filters.targetDate}`)
  }
  const from = new Date(target)
  from.setUTCDate(from.getUTCDate() - daysBefore)
  const to = new Date(target)
  to.setUTCDate(to.getUTCDate() + daysAfter)

  let query = filterActive(
    supabase
      .from('tours')
      .select(
        'id, code, name, departure_date, return_date, days_count, location, airport_code, selling_price_per_person, current_participants, max_participants, status, is_active'
      )
      .eq('workspace_id', ctx.workspaceId)
      .eq('is_active', true)
  )
    .gte('departure_date', formatDateTaipei(from))
    .lte('departure_date', formatDateTaipei(to))
    .order('departure_date', { ascending: true })
    .limit(limit)

  // archived 不一定每筆都有、用 .neq 會排除 NULL、改 .or
  query = query.or('archived.is.null,archived.eq.false')

  if (filters.airportCode) {
    query = query.eq('airport_code', filters.airportCode)
  }
  if (filters.nameKeyword?.trim()) {
    const safe = filters.nameKeyword.replace(/[%_]/g, '\\$&')
    query = query.ilike('name', `%${safe}%`)
  }

  const { data, error } = await query

  if (error) {
    logger.error(`${HANDLER}: search tours failed`, error, {
      workspaceId: ctx.workspaceId,
      targetDate: filters.targetDate,
    })
    throw error
  }

  return (data ?? []) as TourSummary[]
}

/**
 * 拿單一 tour 完整 row（給「客戶問航次細節」用）
 */
export async function botGetTourDetails(ctx: BotContext, tourId: string): Promise<TourRow | null> {
  assertCanRead(ctx, 'botGetTourDetails')

  const supabase = getSupabaseAdminClient()

  const { data, error } = await filterActive(
    supabase.from('tours').select('*').eq('workspace_id', ctx.workspaceId).eq('id', tourId)
  ).maybeSingle()

  if (error) {
    logger.error(`${HANDLER}: get tour details failed`, error, {
      workspaceId: ctx.workspaceId,
      tourId,
    })
    throw error
  }

  return (data as TourRow | null) ?? null
}

// ============================================================================
// 建單
// ============================================================================

/**
 * Bot 建訂單
 *
 * - workspace_id 強制用 ctx
 * - sales_person 強制 'LINE Bot 系統'
 * - status='pending'、payment_status='unpaid'（bot 不碰金流）
 * - code = `${tour.code}-LB${timestamp}`（避免 list-all 算順序）
 * - 寫 audit_logs
 */
export async function botCreateOrder(
  ctx: BotContext,
  input: BotCreateOrderInput
): Promise<OrderRow> {
  assertCanWrite(ctx, 'botCreateOrder')

  // 1. 程式碼層守門
  if (input.totalAmount > SAFETY.MAX_ORDER_AMOUNT) {
    throw new Error(
      `bot 不可建立金額 > ${SAFETY.MAX_ORDER_AMOUNT} 的訂單（input=${input.totalAmount}）`
    )
  }
  if (input.totalAmount < SAFETY.MIN_ORDER_AMOUNT) {
    throw new Error(
      `bot 不可建立金額 < ${SAFETY.MIN_ORDER_AMOUNT} 的訂單（input=${input.totalAmount}）`
    )
  }
  if (input.memberCount > SAFETY.MAX_PARTICIPANTS) {
    throw new Error(
      `bot 不接 > ${SAFETY.MAX_PARTICIPANTS} 人團單（input=${input.memberCount}）、請轉真人`
    )
  }
  if (!input.tourId) throw new Error('botCreateOrder: tourId required')
  if (!input.customerId) throw new Error('botCreateOrder: customerId required')
  if (!input.contactPerson?.trim()) {
    throw new Error('botCreateOrder: contactPerson required')
  }

  const supabase = getSupabaseAdminClient()

  // 2. 雙重驗證 customer 屬於同 workspace（防 LLM 亂塞 id）
  const { data: customer, error: custErr } = await supabase
    .from('customers')
    .select('id, workspace_id')
    .eq('id', input.customerId)
    .maybeSingle()

  if (custErr) throw custErr
  if (!customer) {
    throw new Error(`customer ${input.customerId} not found`)
  }
  if (customer.workspace_id !== ctx.workspaceId) {
    throw new Error(
      `cross-workspace customer access blocked (customer.workspace=${customer.workspace_id}, ctx=${ctx.workspaceId})`
    )
  }

  // 3. 雙重驗證 tour 屬於同 workspace
  const { data: tour, error: tourErr } = await supabase
    .from('tours')
    .select('id, code, workspace_id, departure_date, name')
    .eq('id', input.tourId)
    .maybeSingle()

  if (tourErr) throw tourErr
  if (!tour) throw new Error(`tour ${input.tourId} not found`)
  if (tour.workspace_id !== ctx.workspaceId) {
    throw new Error(
      `cross-workspace tour access blocked (tour.workspace=${tour.workspace_id}, ctx=${ctx.workspaceId})`
    )
  }

  // 4. 算 order code
  const stamp = Date.now().toString(36).toUpperCase()
  const code = `${tour.code}-LB${stamp}`

  const insertPayload = {
    workspace_id: ctx.workspaceId, // 強制
    code,
    customer_id: input.customerId,
    tour_id: input.tourId,
    tour_name: input.tourName || tour.name,
    contact_person: input.contactPerson.trim(),
    contact_phone: input.contactPhone ?? null,
    contact_email: input.contactEmail ?? null,
    departure_date: input.departureDate ?? tour.departure_date,
    adult_count: input.adultCount,
    member_count: input.memberCount,
    identity_options: input.identityOptions ?? null,
    total_amount: input.totalAmount,
    paid_amount: 0,
    remaining_amount: input.totalAmount,
    payment_status: 'unpaid', // bot 不改
    status: 'pending',
    sales_person: 'LINE Bot 系統', // 強制
    notes: input.notes ?? null,
    is_active: true,
    created_by: ctx.botEmployeeId,
    updated_by: ctx.botEmployeeId,
  } satisfies Partial<OrderRow> & {
    workspace_id: string
    code: string
    contact_person: string
  }

  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .insert(insertPayload)
    .select('*')
    .single()

  if (orderErr || !order) {
    logger.error(`${HANDLER}: create order failed`, orderErr, {
      workspaceId: ctx.workspaceId,
      tourId: input.tourId,
    })
    throw orderErr ?? new Error('create order returned no row')
  }

  await writeAuditLog(ctx, {
    action: 'create',
    entity_type: 'orders',
    entity_id: order.id,
    after: order,
    reason: `LINE Bot 自動建單（tour=${tour.code}, line_user=${ctx.lineUserId}）`,
  })

  return order as OrderRow
}
