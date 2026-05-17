/**
 * 報名 API
 * 讓客戶提交報名資料
 * 
 * 安全性：
 * - Rate Limiting：10 req/min per IP（防止滥用）
 * - 護照資料應在儲存前加密（建議在 Supabase Row Level Security + Vault）
 */

import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest
) {
  // Rate Limiting（更嚴格的限制）
  const rateLimited = await checkRateLimit(request, 'tour-registration', 10, 60_000)
  if (rateLimited) return rateLimited

  try {
    const body = await request.json()
    const {
      tourId,
      salesRef,
      customerName,
      customerEmail,
      customerPhone,
      passengerCount,
      notes,
    } = body

    // 基本驗證
    if (!tourId || !customerName || !customerEmail) {
      return NextResponse.json(
        { success: false, error: '缺少必要欄位' },
        { status: 400 }
      )
    }

    // Email 格式驗證
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(customerEmail)) {
      return NextResponse.json(
        { success: false, error: 'Email 格式不正確' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdminClient() as any

    // 插入報名資料
    const { data: registration, error } = await supabase
      .from('tour_registrations')
      .insert({
        tour_id: tourId,
        sales_ref_code: salesRef || null,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone || null,
        passenger_count: passengerCount || 1,
        notes: notes || null,
        status: 'pending',
      })
      .select()
      .single()

    if (error) {
      console.error('Registration error:', error)
      return NextResponse.json(
        { success: false, error: '報名失敗，請稍後再試' },
        { status: 500 }
      )
    }

    // 回傳新建的 registration id（不帶敏感資訊）
    return NextResponse.json({
      success: true,
      data: {
        id: registration?.id,
        message: '報名成功，我們將盡快與您聯繫',
      },
    })
  } catch (err) {
    console.error('Registration parse error:', err)
    return NextResponse.json(
      { success: false, error: '請求格式錯誤' },
      { status: 400 }
    )
  }
}