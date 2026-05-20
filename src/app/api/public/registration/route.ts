/**
 * Corner 官網報名 → ERP 自動建單 API
 *
 * 業務語意（譬喻）：
 *   客人在櫥窗（Corner 官網）填報名單、單子直接掉進廚房訂單堆。
 *   業務上班看到「pending」狀態的單、後續電話 / Email 跟進收訂金。
 *
 * 流程：
 *   1. rate limit（防灌爆）
 *   2. 驗證輸入（姓名 / 台灣手機 / Email / 人數 / tourCode）
 *   3. tour 反查 workspace_id + 確認上架中 + 確認剩餘名額
 *   4. customer email upsert（同 workspace 同 email 視同同一人）
 *   5. 生 order_number（走 @/lib/codes、advisory lock 防撞號）
 *   6. INSERT orders（status='pending'、source='website'、sales_id=null）
 *   7. INSERT order_members（passenger_count 筆、第一個是聯絡人本人）
 *   8. recordApiAuditContext + 回 order_number
 *
 * 規矩對齊：
 *   - 紅線 C：admin client 每 request 新建（getSupabaseAdminClient）
 *   - 紅線 B：created_by 留空（沒員工建單）、不寫 ''（空字串會炸 FK）
 *   - 紅線 E：不寫 tour_registrations（保留為死表、避免雙寫）
 *   - 紅線 0：不靠 isAdmin、純走 tourCode 反查 workspace
 *   - DB CHECK constraint orders_status_check 接受 pending_review/hk/kk/hl/lk
 *     （5/20 用 MCP execute_sql 對 production 直接驗證、跟 order.types.ts 對齊）
 *   - 對應 OrderStatusBadge：pending_review = 待處理（AI/官網進來未接手）
 *   - dbErrorResponse 統一錯誤翻譯
 */

import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'
import { generateOrderNumber } from '@/lib/codes'
import { dbErrorResponse } from '@/lib/db-error-translate'
import { recordApiAuditContext } from '@/lib/audit/audit-helper'
import { withPublicCors, optionsResponse } from '@/lib/cors/public-cors'
import { filterActive } from '@/lib/data/filter-active'

export const dynamic = 'force-dynamic'

const MAX_PASSENGERS = 20 // 跟 spec 對齊（report 表 1-20 人）

// 台灣手機驗證：09xxxxxxxx（10 碼、開頭 09）、允許前面 +886 / 國碼
function isValidTaiwanMobile(phone: string): boolean {
  const trimmed = phone.replace(/[\s-]/g, '')
  // 允許 +886912345678 / 0912345678 兩種形式
  return /^(?:\+?886|0)9\d{8}$/.test(trimmed)
}

function isValidEmail(email: string): boolean {
  // 不追求 RFC 完整、夠擋明顯錯誤即可
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export async function OPTIONS(request: NextRequest) {
  return optionsResponse(request)
}

export async function POST(request: NextRequest) {
  // 1. Rate limit（保留原 10/min/IP、報名 API 嚴格防灌爆）
  const rateLimited = await checkRateLimit(request, 'tour-registration', 10, 60_000)
  if (rateLimited) return withPublicCors(request, rateLimited)

  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return withPublicCors(
        request,
        NextResponse.json({ error: '請求格式錯誤' }, { status: 400 })
      )
    }

    // 2. 驗證輸入
    const name = String(body.name ?? '').trim()
    const phone = String(body.phone ?? '').trim()
    const email = String(body.email ?? '').trim().toLowerCase()
    const passenger_count = Number(body.passenger_count ?? 0)
    const tourCode = String(body.tourCode ?? '').trim()
    const notes = body.notes ? String(body.notes).trim().slice(0, 500) : null

    if (!name || !phone || !email || !tourCode) {
      return withPublicCors(
        request,
        NextResponse.json(
          { error: '請填寫所有必填欄位（姓名 / 電話 / Email / 行程）' },
          { status: 400 }
        )
      )
    }
    if (!isValidEmail(email)) {
      return withPublicCors(
        request,
        NextResponse.json({ error: 'Email 格式不正確' }, { status: 400 })
      )
    }
    if (!isValidTaiwanMobile(phone)) {
      return withPublicCors(
        request,
        NextResponse.json(
          { error: '電話格式不正確（請填台灣手機 09xxxxxxxx）' },
          { status: 400 }
        )
      )
    }
    if (
      !Number.isInteger(passenger_count) ||
      passenger_count < 1 ||
      passenger_count > MAX_PASSENGERS
    ) {
      return withPublicCors(
        request,
        NextResponse.json(
          { error: `人數需為 1-${MAX_PASSENGERS} 之間的整數` },
          { status: 400 }
        )
      )
    }

    const supabase = getSupabaseAdminClient()

    // 3. tour 反查 workspace_id（不信任 client 傳的 workspace）
    // 暫時用 type assertion：is_public_listed 是 5/20 新欄位、types.ts 還沒 regenerate
    type PublicTourLookup = {
      id: string
      code: string
      name: string
      workspace_id: string
      max_participants: number | null
      current_participants: number | null
      selling_price_per_person: number | null
      departure_date: string | null
    }
    const tourResp = await filterActive(
      supabase
        .from('tours')
        .select(
          'id, code, name, workspace_id, max_participants, current_participants, selling_price_per_person, departure_date'
        )
        .eq('code', tourCode)
        .eq('is_public_listed', true)
    ).maybeSingle()
    const tour = tourResp.data as unknown as PublicTourLookup | null
    const tourErr = tourResp.error

    if (tourErr) {
      logger.error('public/registration: lookup tour failed', { tourErr, tourCode })
      return withPublicCors(request, dbErrorResponse(tourErr))
    }
    if (!tour) {
      return withPublicCors(
        request,
        NextResponse.json({ error: '找不到此行程、或尚未開放報名' }, { status: 404 })
      )
    }

    // 額滿檢查（current_participants / max_participants 都可能 null）
    const maxP = tour.max_participants ?? 0
    const curP = tour.current_participants ?? 0
    if (maxP > 0 && curP + passenger_count > maxP) {
      const remaining = Math.max(0, maxP - curP)
      return withPublicCors(
        request,
        NextResponse.json(
          {
            error: `名額不足（剩 ${remaining} 位、您填 ${passenger_count} 位）`,
            remaining,
          },
          { status: 409 }
        )
      )
    }

    const workspaceId: string = tour.workspace_id
    const unitPrice: number = Number(tour.selling_price_per_person ?? 0)
    const totalAmount = unitPrice * passenger_count

    // 4. customer email upsert（同 workspace + 同 email = 同一人）
    //
    // race condition 考量：
    //   同一秒兩個請求同 email 進來、可能都查不到、各自 INSERT、撞 unique
    //   → 用 try insert、撞 23505 unique 就再 SELECT 一次拿到既有 row
    //
    // 為什麼不用 .upsert()：
    //   customers 表的 code 是隨機 timestamp、不是 email；upsert 需要 onConflict
    //   指向 email index、確認 DB 有 unique(workspace_id, email) 才能安全用。
    //   現況看 types.ts customers 並無 unique email constraint、所以走 SELECT-then-INSERT
    //   即使 race 撞 unique（其他 column 如 code）也會被 catch 處理。
    let customerId: string | null = null
    {
      const { data: existing, error: lookErr } = await filterActive(
        supabase
          .from('customers')
          .select('id')
          .eq('email', email)
          .eq('workspace_id', workspaceId)
      ).maybeSingle()
      if (lookErr) {
        logger.error('public/registration: lookup customer failed', { lookErr })
        return withPublicCors(request, dbErrorResponse(lookErr))
      }

      if (existing) {
        customerId = existing.id
      } else {
        // 建新 customer
        const newId = crypto.randomUUID()
        const code = `WB${Date.now().toString(36).toUpperCase()}` // WB = website
        const { data: created, error: createErr } = await supabase
          .from('customers')
          .insert({
            id: newId,
            workspace_id: workspaceId,
            code,
            name,
            phone,
            email,
            source: 'website',
            member_type: 'potential', // CHECK constraint: ['potential','member','vip']
            is_active: true,
          })
          .select('id')
          .single()

        if (createErr) {
          // 23505 = unique violation；幾乎 100% 是另一個 request 同時建了同 email
          const pgCode = (createErr as { code?: string }).code
          if (pgCode === '23505') {
            const { data: retry, error: retryErr } = await filterActive(
              supabase
                .from('customers')
                .select('id')
                .eq('email', email)
                .eq('workspace_id', workspaceId)
            ).maybeSingle()
            if (retryErr || !retry) {
              logger.error('public/registration: race retry failed', {
                retryErr,
                createErr,
              })
              return withPublicCors(request, dbErrorResponse(createErr))
            }
            customerId = retry.id
          } else {
            logger.error('public/registration: create customer failed', { createErr })
            return withPublicCors(request, dbErrorResponse(createErr))
          }
        } else {
          customerId = created.id
        }
      }
    }

    if (!customerId) {
      // 理論上走不到、保險
      return withPublicCors(
        request,
        NextResponse.json({ error: '建立客戶失敗' }, { status: 500 })
      )
    }

    // 5. 生 order_number（@/lib/codes、走 DB advisory lock）
    let orderNumber: string
    try {
      orderNumber = await generateOrderNumber(tour.id, supabase as unknown as Parameters<typeof generateOrderNumber>[1])
    } catch (err) {
      logger.error('public/registration: generate order number failed', { err })
      return withPublicCors(request, dbErrorResponse(err))
    }

    // 6. INSERT orders
    //    sales_id = null（沒員工建單、官網報名）
    //    created_by = null（沒登入 user、留空、紅線 B 別寫空字串）
    //    status = 'pending_review'（DB CHECK 接受 pending_review/hk/kk/hl/lk、對齊 spec）
    //    source = 'website'（DB NOT NULL）
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert({
        workspace_id: workspaceId,
        order_number: orderNumber,
        tour_id: tour.id,
        tour_name: tour.name,
        customer_id: customerId,
        status: 'pending_review',
        source: 'website',
        contact_person: name,
        contact_phone: phone,
        contact_email: email,
        adult_count: passenger_count,
        member_count: passenger_count,
        total_amount: totalAmount,
        paid_amount: 0,
        remaining_amount: totalAmount,
        payment_status: 'unpaid',
        sales_id: null,
        sales_person: '官網報名',
        departure_date: tour.departure_date,
        notes,
        is_active: true,
      })
      .select('id, order_number')
      .single()

    if (orderErr || !order) {
      logger.error('public/registration: create order failed', { orderErr })
      return withPublicCors(request, dbErrorResponse(orderErr ?? new Error('create order returned no row')))
    }

    // 7. INSERT order_members（第一個是聯絡人本人、其餘空名「團員 N」）
    const memberRows = Array.from({ length: passenger_count }, (_, i) => ({
      order_id: order.id,
      workspace_id: workspaceId,
      tour_id: tour.id,
      customer_id: i === 0 ? customerId : null,
      chinese_name: i === 0 ? name : `團員 ${i + 1}`,
      identity: 'adult',
      member_type: 'main', // 預設、之後業務跟進可改
      sort_order: i,
      selling_price: unitPrice,
    }))

    const { error: memberErr } = await supabase.from('order_members').insert(memberRows)
    if (memberErr) {
      // 訂單已成功建立、members 失敗只記 log、不 rollback（業務後續可補）
      logger.error('public/registration: create members failed (order created OK)', {
        memberErr,
        orderId: order.id,
      })
    }

    // 8. audit context（actorId 留空 ''；audit-helper 早 return、不會炸）
    //    沒員工 id、是「官網訪客」、reason 寫清楚
    await recordApiAuditContext(supabase, {
      actorId: '', // 無員工身分、helper 內部會 early return
      reason: `官網訪客報名（tour=${tour.code}, email=${email}）`,
    })

    return withPublicCors(
      request,
      NextResponse.json({
        order_id: order.id,
        order_number: order.order_number,
        message: '報名成功、業務會聯絡您',
      })
    )
  } catch (err) {
    logger.error('public/registration: unexpected', { err })
    return withPublicCors(request, dbErrorResponse(err))
  }
}
