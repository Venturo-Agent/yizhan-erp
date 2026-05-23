'use client'

/**
 * 公開行程頁面 — Canvas版本
 *
 * 路由：/p/tour/[code]/canvas?ref=E001
 *
 * 為什麼開一條平行路由：
 * - 原 /p/tour/[code]（Tokyo Sakura 風）保留、舊連結不壞
 * - Canvas是新主題、用獨立 URL 給業務 / 客戶選
 * - 將來預設要切過來的話、改原 page.tsx 內部選擇即可、URL 不變
 *
 * 資料來源：跟原頁面一樣讀 tours + itineraries + airport_images + employees
 * 多走一層 adapter → Canvas Canvas JSON → CanvasRenderer
 */

import { useState, useEffect, use, useMemo } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase/client'
import { ModuleLoading } from '@/components/module-loading'
import { CanvasRenderer } from '@/components/canvas-renderer'
import type { Canvas } from '@/components/canvas-renderer'
import { buildCanvasFromTour } from '@/lib/canvas/canvas-from-tour'
import { enrichDailyItinerary } from '@/lib/canvas/enrich-itinerary'
import type {
  TourData,
  EmployeeInfo,
  CompanyInfo,
} from '../_components/tour-types'

export default function PublicTourCanvasPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const t = useTranslations('publicPage')
  const { code } = use(params)
  const searchParams = useSearchParams()
  const ref = searchParams.get('ref')

  const [tour, setTour] = useState<TourData | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [heroImage, setHeroImage] = useState<string | null>(null)
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    name: '旅行社',
    phone: '',
  })
  const [employee, setEmployee] = useState<EmployeeInfo | null>(null)
  /**
   * 業務發布過的 canvas 快照
   *
   * 載入流程：
   * 1. 先打 /api/public/tour/[code]/display-canvas 看有沒有 published_canvas
   * 2. 有 → 用 published canvas 渲染（業務手動編過、客人看的是業務版本）
   * 3. 沒 → fallback 用 buildCanvasFromTour 從 tour 資料自動生
   *
   * 5/17 加：原本只有 auto-generate、現在優先讀業務發布版本
   */
  const [publishedCanvas, setPublishedCanvas] = useState<Canvas | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      // 平行打公開 canvas API、不阻塞 tour 主流程
      // 結果分開存、render 時再決定用 published_canvas 還是 auto-generate
      fetch(`/api/public/tour/${code}/display-canvas`)
        .then(async (res) => {
          if (!res.ok) return null
          const json = (await res.json()) as { canvas: Canvas | null }
          return json.canvas
        })
        .then((canvas) => {
          if (canvas) setPublishedCanvas(canvas)
        })
        .catch(() => {
          // 公開 canvas fetch 失敗不影響主流程、fallback auto-generate 即可
        })

      // 5/17 修：tours.id (text) ↔ itineraries.tour_id (uuid) 型別不一致、嵌入查詢炸
      //       改兩步查 + enrich daily_itinerary
      const { data: tourData, error } = await supabase
        .from('tours')
        .select(
          `id, code, departure_date, selling_price_per_person, max_participants,
           current_participants, days_count, airport_code, workspace_id`
        )
        .eq('code', code)
        .not('is_active', 'is', false)
        .maybeSingle()

      if (error || !tourData) {
        setNotFound(true)
        setLoading(false)
        return
      }

      // Step 2: 用 tour.id 查 itinerary
      const { data: rawItinerary } = await supabase
        .from('itineraries')
        .select('id, title, subtitle, daily_itinerary, hotels')
        .eq('tour_id', tourData.id)
        .maybeSingle()

      // Step 3: enrich daily — 撈 attractions / hotels 補完描述跟圖
      // daily_itinerary 在 supabase 是 jsonb、type 推成 union、cast 成具體陣列型別
      const rawDaily = (rawItinerary?.daily_itinerary ?? null) as
        | import('../_components/tour-types').DailyItinerary[]
        | null
      const enrichedDaily = await enrichDailyItinerary(supabase, rawDaily)

      setTour({
        ...tourData,
        itinerary: rawItinerary
          ? { ...rawItinerary, daily_itinerary: enrichedDaily }
          : null,
      } as TourData)

      // 公司資訊
      if (tourData.workspace_id) {
        const { data: workspace } = await supabase
          .from('workspaces')
          .select('legal_name, phone')
          .eq('id', tourData.workspace_id)
          .single()

        if (workspace) {
          setCompanyInfo({
            name: workspace.legal_name || '旅行社',
            phone: workspace.phone || '',
          })
        }
      }

      // Hero 圖
      if (tourData.airport_code) {
        const { data: imageData } = await supabase
          .from('airport_images')
          .select('image_url')
          .eq('airport_code', tourData.airport_code)
          .eq('is_default', true)
          .single()

        if (imageData?.image_url) {
          setHeroImage(imageData.image_url)
        }
      }

      // 業務員資訊（用 ?ref= 帶）
      if (ref) {
        const { data: empData } = await supabase
          .from('employees')
          .select('display_name, email, avatar_url, employee_number')
          .or(`employee_number.eq.${ref},id.eq.${ref}`)
          .single()

        if (empData) {
          setEmployee(empData)
        }
      }

      setLoading(false)
    }

    fetchData()
  }, [code, ref])

  // Canvas Canvas（優先 published_canvas、否則 auto-generate）
  //
  // 設計：
  // - 業務在後台編過並發布 → 用 published_canvas（client 改的、有人味）
  // - 業務沒編過 → auto-generate from tour data（系統自動產、骨架版）
  // - tour 本身找不到 → 不渲染、顯示 notFound
  const canvas = useMemo(() => {
    if (publishedCanvas) return publishedCanvas
    if (!tour) return null
    return buildCanvasFromTour({
      tour,
      heroImage,
      employee,
      companyInfo,
    })
  }, [publishedCanvas, tour, heroImage, employee, companyInfo])

  if (loading) {
    return <ModuleLoading fullscreen className="bg-background" />
  }

  if (notFound || !tour || !canvas) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-morandi-primary mb-4">
            {t('tourNotFound')}
          </h1>
          <p className="text-morandi-secondary mb-8">{t('tourNotFoundDesc')}</p>
          <Link href="/">
            <Button>{t('backToHome')}</Button>
          </Link>
        </div>
      </div>
    )
  }

  return <CanvasRenderer canvas={canvas} />
}
