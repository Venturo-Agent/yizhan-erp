import {
  Home,
  Plane,
  MapPin,
  Phone,
  Users,
  HelpCircle,
  DollarSign,
  Hotel,
  Sparkles,
  AlertCircle,
  type LucideIcon,
} from 'lucide-react'
import { COMPANY_NAME } from '@/lib/tenant'
import { FloatingDock } from '@/components/ui/floating-dock'
import { useMemo } from 'react'
import type { TourPageData } from '@/app/(main)/tours/_types/tour-display.types'

interface NavLink {
  title: string
  icon: LucideIcon
  href: string
}

interface TourNavigationProps {
  data: TourPageData
  scrollOpacity: number
  isPreview: boolean
  viewMode: 'desktop' | 'mobile'
}

export function TourNavigation({ data, scrollOpacity, isPreview, viewMode }: TourNavigationProps) {
  // 動態生成導航連結，根據實際有內容的區塊
  const navLinks = useMemo(() => {
    const links: NavLink[] = [
      { title: '首頁', icon: Home, href: '#top' },
      { title: '航班', icon: Plane, href: '#flight' },
    ]

    // 行程特色
    if (data.showFeatures !== false && data.features && data.features.length > 0) {
      links.push({ title: '特色', icon: Sparkles, href: '#features' })
    }

    // 行程（幾乎一定有）
    if (data.dailyItinerary && data.dailyItinerary.length > 0) {
      links.push({ title: '行程', icon: MapPin, href: '#itinerary' })
    }

    // 領隊與集合資訊
    const hasLeaderInfo =
      data.leader?.name ||
      data.meetingInfo?.time ||
      data.meetingInfo?.location ||
      (data.meetingPoints && data.meetingPoints.length > 0)
    if (hasLeaderInfo) {
      links.push({ title: '領隊', icon: Phone, href: '#leader' })
    }

    // 飯店
    if (data.showHotels !== false && data.hotels && data.hotels.length > 0) {
      links.push({ title: '住宿', icon: Hotel, href: '#hotels' })
    }

    // 價格方案
    if (data.showPriceTiers && data.priceTiers && data.priceTiers.length > 0) {
      links.push({ title: '價格', icon: Users, href: '#price-tiers' })
    }

    // 團費說明
    if (data.showPricingDetails && data.pricingDetails) {
      links.push({ title: '團費', icon: DollarSign, href: '#pricing' })
    }

    // 常見問題
    if (data.showFaqs && data.faqs && data.faqs.length > 0) {
      links.push({ title: 'FAQ', icon: HelpCircle, href: '#faq' })
    }

    // 提醒事項/取消政策
    const hasNotices =
      (data.showNotices && data.notices && data.notices.length > 0) ||
      (data.showCancellationPolicy && data.cancellationPolicy && data.cancellationPolicy.length > 0)
    if (hasNotices) {
      links.push({ title: '須知', icon: AlertCircle, href: '#notices' })
    }

    return links
  }, [data])

  return (
    <>
      {/* 置頂導航列 - 桌面版或非預覽模式才顯示 */}
      {(!isPreview || viewMode === 'desktop') && (
        <nav
          className="fixed left-0 right-0 z-40 transition-all duration-300 hidden md:block"
          style={{
            // 滾動後使用深色背景，確保清晰可見
            backgroundColor:
              scrollOpacity > 0.1
                ? `rgba(30, 41, 59, ${Math.min(scrollOpacity * 1.5, 0.95)})` // slate-800
                : 'transparent',
            backdropFilter: scrollOpacity > 0.1 ? 'blur(12px)' : 'none',
            boxShadow: scrollOpacity > 0.3 ? '0 4px 12px -2px rgba(0, 0, 0, 0.3)' : 'none',
          }}
        >
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              <div className="text-xl font-bold text-white">{COMPANY_NAME}</div>
              <div className="flex items-center gap-6">
                {navLinks.map(link => {
                  const IconComponent = link.icon || Home
                  return (
                    <a
                      key={link.href}
                      href={link.href}
                      className="flex items-center gap-1.5 transition-all text-white/90 hover:text-morandi-gold"
                    >
                      <IconComponent className="w-4 h-4" />
                      <span className="text-sm font-medium">{link.title}</span>
                    </a>
                  )
                })}
              </div>
            </div>
          </div>
        </nav>
      )}

      {/* 手機版底部導航 */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 md:hidden">
        <FloatingDock
          items={navLinks.map(link => ({
            title: link.title,
            icon: <link.icon className="w-5 h-5" />,
            href: link.href,
          }))}
          mobileClassName="block md:hidden"
        />
      </div>
    </>
  )
}
