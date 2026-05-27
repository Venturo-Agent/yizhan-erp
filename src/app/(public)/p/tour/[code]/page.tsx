'use client'

/**
 * 公開行程頁面 - Tokyo Sakura 風格
 * 路由: /p/tour/[code]?ref=E001
 *
 * 特色：
 * - Sticky 日期導航（滾動自動高亮）
 * - 時間軸佈局
 * - 側邊欄報名卡片
 * - 底部業務資訊（從 ref 參數帶入）
 */

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase/client'
import { ModuleLoading } from '@/components/module-loading'
import type { TourData, EmployeeInfo, CompanyInfo } from './_components/tour-types'
import { TourHeader } from './_components/tour-header'
import { TourHero } from './_components/tour-hero'
import { TourItinerary } from './_components/tour-itinerary'
import { TourSidebar } from './_components/tour-sidebar'
import { TourFooter } from './_components/tour-footer'

export default function PublicTourPage({ params }: { params: Promise<{ code: string }> }) {
  const t = useTranslations('publicPage')
  const { code } = use(params)
  const searchParams = useSearchParams()
  const ref = searchParams.get('ref')

  const [tour, setTour] = useState<TourData | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [heroImage, setHeroImage] = useState<string | null>(null)
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({ name: '旅行社', phone: '' })
  const [employee, setEmployee] = useState<EmployeeInfo | null>(null)
  const [activeDay, setActiveDay] = useState(0)

  useEffect(() => {
    const fetchData = async () => {
      // 用 code 查 tour
      const { data: tourData, error } = await supabase
        .from('tours')
        .select(
          `
          id,
          code,
          departure_date,
          selling_price_per_person,
          max_participants,
          current_participants,
          days_count,
          airport_code,
          workspace_id,
          itinerary:itineraries (
            id,
            title,
            subtitle,
            daily_itinerary,
            hotels
          )
        `
        )
        .eq('code', code)
        .eq('is_active', true)
        .single()

      if (error || !tourData) {
        setNotFound(true)
        setLoading(false)
        return
      }

      const itineraryData = Array.isArray(tourData.itinerary)
        ? tourData.itinerary[0]
        : tourData.itinerary

      setTour({
        ...tourData,
        itinerary: itineraryData || null,
      } as TourData)

      // 載入公司資訊
      if (tourData.workspace_id) {
        const { data: workspace } = await supabase
          .from('workspaces')
          .select('legal_name, phone, logo_url, logo_scale, logo_offset_x, logo_offset_y')
          .eq('id', tourData.workspace_id)
          .single()

        if (workspace) {
          setCompanyInfo({
            name: workspace.legal_name || '旅行社',
            phone: workspace.phone || '',
            logo_url: workspace.logo_url,
            logo_scale: workspace.logo_scale,
            logo_offset_x: workspace.logo_offset_x,
            logo_offset_y: workspace.logo_offset_y,
          })
        }
      }

      // 載入 Hero 圖片
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

      // 載入業務資訊
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

  // 滾動追蹤
  useEffect(() => {
    const handleScroll = () => {
      const dailyItinerary = tour?.itinerary?.daily_itinerary || []
      let current = 0

      dailyItinerary.forEach((_, index) => {
        const element = document.getElementById(`day${index + 1}`)
        if (element) {
          const rect = element.getBoundingClientRect()
          if (rect.top <= 200) {
            current = index
          }
        }
      })

      setActiveDay(current)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [tour])

  // 計算
  const daysCount = tour?.days_count || tour?.itinerary?.daily_itinerary?.length || 0
  const nightsCount = daysCount > 0 ? daysCount - 1 : 0
  const remainingSlots = (tour?.max_participants || 0) - (tour?.current_participants || 0)
  const dailyItinerary = tour?.itinerary?.daily_itinerary || []

  if (loading) {
    return <ModuleLoading fullscreen className="bg-background" />
  }

  if (notFound || !tour) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-morandi-primary mb-4">{t('tourNotFound')}</h1>
          <p className="text-morandi-secondary mb-8">{t('tourNotFoundDesc')}</p>
          <Link href="/">
            <Button>{t('backToHome')}</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-morandi-primary">
      <TourHeader
        code={code}
        ref={ref}
        companyName={companyInfo.name}
        dailyItinerary={dailyItinerary}
        activeDay={activeDay}
      />

      <TourHero
        heroImage={heroImage}
        title={tour.itinerary?.title ?? null}
        subtitle={tour.itinerary?.subtitle ?? null}
        code={code}
        daysCount={daysCount}
        nightsCount={nightsCount}
      />

      <main className="max-w-7xl mx-auto px-6 py-12 md:py-24 flex flex-col md:flex-row gap-12 relative">
        <div className="flex-1">
          <TourItinerary dailyItinerary={dailyItinerary} />
        </div>

        <TourSidebar
          tour={tour}
          code={code}
          ref={ref}
          companyPhone={companyInfo.phone}
          dailyItinerary={dailyItinerary}
          daysCount={daysCount}
          nightsCount={nightsCount}
          remainingSlots={remainingSlots}
        />
      </main>

      <TourFooter employee={employee} companyInfo={companyInfo} />
    </div>
  )
}
