/**
 * GET /api/line/conversations/[lineUserId]/customer-orders
 *
 * 列出該 LINE 對話「綁定客戶」的最近 10 筆訂單。
 * 用於對話頁右側 sidebar、顯示客戶歷史訂單。
 *
 * 流程：
 *   1. 從 line_user_profiles 拿綁定的 customer_id
 *   2. 沒綁 → 回 { customer: null, orders: [] }
 *   3. 有綁 → 拿 customer 基本資料 + 該 customer 最近 10 筆訂單
 *
 * Capability: orders.read
 *   - 觀察當前 workspace 的訂單、走 workspace_id filter + RLS
 *
 * 軟刪過濾：過濾掉已軟刪 row
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerAuth } from '@/lib/auth/server-auth'
import { requireCapability } from '@/lib/auth/require-capability'
import { requireWorkspaceFeature } from '@/lib/auth/require-feature'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'
import { filterActive } from '@/lib/data/filter-active'
import { translateDbError } from '@/lib/db-error-translate'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface CustomerOrderItem {
  id: string
  code: string | null
  order_number: string | null
  tour_name: string | null
  departure_date: string | null
  status: string | null
  payment_status: string | null
  total_amount: number | null
  paid_amount: number | null
  remaining_amount: number | null
  created_at: string
}

export interface CustomerOrdersResponse {
  customer: {
    id: string
    code: string | null
    name: string
    phone: string | null
    email: string | null
  } | null
  orders: CustomerOrderItem[]
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ lineUserId: string }> }
) {
  try {
    const { lineUserId } = await params

    const auth = await getServerAuth()
    if (!auth.success) {
      return NextResponse.json({ error: '請先登入' }, { status: 401 })
    }

    const guard = await requireCapability(CAPABILITIES.ORDERS_READ)
    if (!guard.ok) return guard.response

    // LINE bot 對話頁的 sidebar、租戶要有買 line_bot 才能用
    const feature = await requireWorkspaceFeature(guard.workspaceId, 'line_bot', 'LINE Bot')
    if (!feature.ok) return feature.response

    // line_user_profiles 尚未納入生成類型，用 unknown 中轉
    const supabaseAny = getSupabaseAdminClient() as unknown as SupabaseClient

    // 1. 拿 line_user_profiles 看是否綁了 customer
    const { data: profile, error: profileErr } = await supabaseAny
      .from('line_user_profiles')
      .select('customer_id')
      .eq('workspace_id', guard.workspaceId)
      .eq('line_user_id', lineUserId)
      .maybeSingle()

    if (profileErr) {
      logger.error('[customer-orders] profile error:', profileErr)
      return NextResponse.json({ error: translateDbError(profileErr).message }, { status: 500 })
    }

    const customerId: string | null = profile?.customer_id ?? null
    if (!customerId) {
      return NextResponse.json({ customer: null, orders: [] })
    }

    // 2. 拿 customer 基本資料
    const { data: customer, error: customerErr } = await supabaseAny
      .from('customers')
      .select('id, code, name, phone, email')
      .eq('id', customerId)
      .eq('workspace_id', guard.workspaceId)
      .maybeSingle()

    if (customerErr) {
      logger.error('[customer-orders] customer error:', customerErr)
      return NextResponse.json({ error: translateDbError(customerErr).message }, { status: 500 })
    }
    if (!customer) {
      // 客戶被刪 / 跨 workspace、視為未綁
      return NextResponse.json({ customer: null, orders: [] })
    }

    // 3. 拿該 customer 最近 10 筆訂單（軟刪過濾、排序：建立時間倒序）
    const { data: ordersRaw, error: ordersErr } = await filterActive(
      supabaseAny
        .from('orders')
        .select(
          // A1（5/13 拍板）：砍 orders.code、order_number 為 SSOT
          'id, order_number, tour_name, departure_date, status, payment_status, total_amount, paid_amount, remaining_amount, created_at'
        )
        .eq('workspace_id', guard.workspaceId)
        .eq('customer_id', customerId)
    )
      .order('created_at', { ascending: false })
      .limit(10)

    if (ordersErr) {
      logger.error('[customer-orders] orders error:', ordersErr)
      return NextResponse.json({ error: translateDbError(ordersErr).message }, { status: 500 })
    }

    const orders: CustomerOrderItem[] = (ordersRaw ?? []).map(
      (o: Record<string, unknown>) => ({
        id: String(o.id ?? ''),
        code: (o.order_number as string | null) ?? null, // A1：orders.code 砍、回 order_number 兼容 caller
        order_number: (o.order_number as string | null) ?? null,
        tour_name: (o.tour_name as string | null) ?? null,
        departure_date: (o.departure_date as string | null) ?? null,
        status: (o.status as string | null) ?? null,
        payment_status: (o.payment_status as string | null) ?? null,
        total_amount: (o.total_amount as number | null) ?? null,
        paid_amount: (o.paid_amount as number | null) ?? null,
        remaining_amount: (o.remaining_amount as number | null) ?? null,
        created_at: String(o.created_at ?? ''),
      })
    )

    const response: CustomerOrdersResponse = {
      customer: {
        id: String(customer.id),
        code: (customer.code as string | null) ?? null,
        name: String(customer.name ?? ''),
        phone: (customer.phone as string | null) ?? null,
        email: (customer.email as string | null) ?? null,
      },
      orders,
    }

    return NextResponse.json(response)
  } catch (error) {
    logger.error('API Error', { path: _req.nextUrl.pathname, error })
    return NextResponse.json({ success: false, error: '系統錯誤，請稍後再試' }, { status: 500 })
  }
}
