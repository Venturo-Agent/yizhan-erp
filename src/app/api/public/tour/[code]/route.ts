/**
 * 公開旅程 API
 * 獲取公開的旅程資訊（展示行程用）
 * 
 * 安全性：
 * - Rate Limiting：60 req/min per IP
 * - 只回傳必要欄位（無 internal 資料）
 * - 不暴露 workspace_id、internal notes 等敏感資訊
 */

import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  // Rate Limiting
  const rateLimited = await checkRateLimit(request, 'public-tour', 60, 60_000)
  if (rateLimited) return rateLimited

  // 解析 params
  const { code } = await params

  if (!code) {
    return NextResponse.json(
      { success: false, error: '缺少團號' },
      { status: 400 }
    )
  }

  const supabase = getSupabaseAdminClient() as any

  // 只查必要欄位，不暴露 internal 資料
  const { data: tour, error } = await supabase
    .from('tours')
    .select(`
      id,
      code,
      name,
      departure_date,
      days_count,
      selling_price_per_person,
      max_participants,
      current_participants,
      airport_code
    `)
    .eq('code', code)
    .eq('is_active', true)
    .single()

  if (error || !tour) {
    return NextResponse.json(
      { success: false, error: '找不到該旅程' },
      { status: 404 }
    )
  }

  // 取得行程資料
  const { data: itinerariesData } = await supabase
    .from('itineraries')
    .select('id, title, subtitle, daily_itinerary, hotels')
    .eq('tour_id', tour.id)
    .limit(1)

  const itineraryData = itinerariesData?.[0] || null

  // 回傳乾淨的資料（不包含 workspace_id 等）
  return NextResponse.json({
    success: true,
    data: {
      id: tour.id,
      code: tour.code,
      name: tour.name,
      departureDate: tour.departure_date,
      daysCount: tour.days_count || 0,
      nightsCount: (tour.days_count || 1) - 1,
      price: tour.selling_price_per_person,
      maxParticipants: tour.max_participants || 0,
      currentParticipants: tour.current_participants || 0,
      remainingSlots: (tour.max_participants || 0) - (tour.current_participants || 0),
      airportCode: tour.airport_code,
      itinerary: itineraryData ? {
        id: itineraryData.id,
        title: itineraryData.title,
        subtitle: itineraryData.subtitle,
        dailyItinerary: itineraryData.daily_itinerary,
        hotels: itineraryData.hotels,
      } : null,
    },
  })
}