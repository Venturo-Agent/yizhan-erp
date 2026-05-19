'use client'

import { useState, useEffect, useMemo } from 'react'
import useSWR from 'swr'
import { useParams, useRouter } from 'next/navigation'
import { useSearchParams } from 'next/navigation'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { Button } from '@/components/ui/button'
import { MapPin } from 'lucide-react'
import { ModuleLoading } from '@/components/module-loading'
import { fetchTourIdByCode } from '@/data'
import { useTourDetails } from '@/app/(main)/tours/_hooks/useTours-advanced'
import { useAuthStore } from '@/stores/auth-store'
import { TOUR_TABS, TourTabContent } from '@/app/(main)/tours/_components/TourTabs'
import { useVisibleModuleTabs } from '@/lib/permissions/hooks'
import { needsItineraryServiceType } from '@/lib/constants/tour-service-types'
import { useTranslations } from 'next-intl'

export default function TourDetailPage() {
  const t = useTranslations('tour')
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const rawCode = params.code as string
  const code = rawCode ? decodeURIComponent(rawCode) : ''

  const { user } = useAuthStore()

  // 用 SWR 查詢 tour_id
  const { data: tourId, isLoading: loadingTourId } = useSWR(code ? `tour-id-${code}` : null, () =>
    fetchTourIdByCode(code)
  )

  // 5/13 William 拍板：預設 orders（業務最常看訂單）、總覽移最右
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'orders')
  const [forceShowPnr, setForceShowPnr] = useState(false)

  // 依 workspace 功能權限過濾可見的 tab（會自動隱藏未開通的付費 tab，如合約、展示行程）
  const featureVisibleTabs = useVisibleModuleTabs('tours', TOUR_TABS)

  // 監聽分頁變更，更新 URL 和 localStorage
  useEffect(() => {
    // 更新 URL（不增加瀏覽器歷史記錄）
    const params = new URLSearchParams(window.location.search)
    params.set('tab', activeTab)
    router.replace(`/tours/${code}?${params.toString()}`, { scroll: false })
  }, [activeTab, code, router])

  // 載入團詳情
  const { tour, loading, actions } = useTourDetails(tourId || '')

  // 5/19 條件性 hide「行程 / 展示行程」：機票 / 機加酒 / 外丟 / 簽證 / 網卡 不需行程
  const visibleTabs = useMemo(() => {
    if (!tour || needsItineraryServiceType(tour.tour_service_type)) return featureVisibleTabs
    return featureVisibleTabs.filter(
      (t) => t.value !== 'itinerary' && t.value !== 'display-itinerary'
    )
  }, [featureVisibleTabs, tour])

  // 返回列表
  const handleBack = () => {
    router.push('/tours')
  }

  // 處理資料更新
  const _handleSuccess = () => {
    actions.refresh()
    setForceShowPnr(true)
  }

  // 載入中
  if (loadingTourId || loading) {
    return (
      <ContentPageLayout
        title={t('tourDetailLoading')}
        icon={MapPin}
        breadcrumb={[
          { label: t('tourDetailBreadcrumbTours'), href: '/tours' },
          { label: code, href: `/tours/${code}` },
        ]}
      >
        <ModuleLoading />
      </ContentPageLayout>
    )
  }

  // 找不到團
  if (!tour) {
    return (
      <ContentPageLayout
        title={t('tourDetailNotFound')}
        icon={MapPin}
        breadcrumb={[
          { label: t('tourDetailBreadcrumbTours'), href: '/tours' },
          { label: code, href: `/tours/${code}` },
        ]}
      >
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-morandi-secondary mb-4">
              {t('tourDetailNotFoundCode')} {code} {t('tourDetailNotFoundSuffix')}
            </p>
            <Button onClick={handleBack}>{t('tourDetailBackBtn')}</Button>
          </div>
        </div>
      </ContentPageLayout>
    )
  }

  return (
    <ContentPageLayout
      title={tour.name}
      icon={MapPin}
      breadcrumb={[
        { label: t('tourDetailBreadcrumbTours'), href: '/tours' },
        { label: `${tour.code} ${tour.name}`, href: `/tours/${code}` },
      ]}
      tabs={visibleTabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      contentClassName="flex-1 overflow-auto"
    >
      <TourTabContent
        tour={tour}
        activeTab={activeTab}
        workspaceId={user?.workspace_id}
        forceShowPnr={forceShowPnr}
      />
    </ContentPageLayout>
  )
}
