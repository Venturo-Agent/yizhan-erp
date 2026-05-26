'use client'

/**
 * 公開行程頁面 - 側邊欄（價格卡 + 行程摘要 + 服務特點）
 */

import Link from 'next/link'
import { Calendar, Users, Clock, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslations } from 'next-intl'
import { formatDate } from '@/lib/utils/format-date'
import type { TourData, DailyItinerary } from './tour-types'

interface TourSidebarProps {
  tour: TourData
  code: string
  ref?: string | null
  companyPhone: string
  dailyItinerary: DailyItinerary[]
  daysCount: number
  nightsCount: number
  remainingSlots: number
}

export function TourSidebar({
  tour,
  code,
  ref: refParam,
  companyPhone,
  dailyItinerary,
  daysCount,
  nightsCount,
  remainingSlots,
}: TourSidebarProps) {
  const t = useTranslations('publicPage')

  return (
    <aside className="md:w-[23.75rem]">
      <div className="sticky top-40 space-y-6">
        {/* Price Card */}
        <div className="bg-card p-8 rounded-2xl shadow-sm border border-border">
          <div className="text-morandi-secondary text-xs font-bold tracking-widest uppercase mb-2">
            行程價格
          </div>
          <div className="flex items-baseline gap-2 mb-8">
            {tour.selling_price_per_person ? (
              <>
                <span className="text-4xl font-extrabold text-public-primary">
                  TWD {tour.selling_price_per_person.toLocaleString()}
                </span>
                <span className="text-morandi-muted text-sm">/ 人</span>
              </>
            ) : (
              <span className="text-2xl font-bold text-morandi-secondary">{t('priceInquiry')}</span>
            )}
          </div>

          <div className="space-y-3">
            <Link href={`/p/tour/${code}/register${refParam ? `?ref=${refParam}` : ''}`}>
              <Button className="w-full bg-gradient-to-r from-public-primary to-public-accent text-white py-4 rounded-xl font-bold hover:shadow-lg transition-all">
                立即預約
              </Button>
            </Link>
            {companyPhone && (
              <a href={`tel:${companyPhone}`} className="block">
                <Button
                  variant="soft-gold"
                  className="w-full border-public-primary text-public-primary py-4 rounded-xl font-bold hover:bg-morandi-container/50 transition-all"
                >
                  諮詢專屬顧問
                </Button>
              </a>
            )}
          </div>

          {/* Info */}
          <div className="mt-8 pt-8 border-t border-border space-y-4">
            {tour.departure_date && (
              <div className="flex items-center gap-3 text-sm text-morandi-primary">
                <Calendar className="w-4 h-4 text-morandi-green" />
                <span>出發日期：{formatDate(tour.departure_date)}</span>
              </div>
            )}
            {tour.max_participants && (
              <div className="flex items-center gap-3 text-sm text-morandi-primary">
                <Users className="w-4 h-4 text-morandi-green" />
                <span>剩餘名額：{remainingSlots > 0 ? `${remainingSlots} 位` : '已額滿'}</span>
              </div>
            )}
            {daysCount > 0 && (
              <div className="flex items-center gap-3 text-sm text-morandi-primary">
                <Clock className="w-4 h-4 text-morandi-green" />
                <span>
                  行程天數：{daysCount} 天 {nightsCount} 夜
                </span>
              </div>
            )}
          </div>

          {/* Itinerary Summary */}
          {dailyItinerary.length > 0 && (
            <div className="mt-8 pt-8 border-t border-border">
              <div className="text-xs font-bold text-morandi-secondary uppercase tracking-widest mb-4">
                行程摘要
              </div>
              <ul className="space-y-3">
                {dailyItinerary.map((day, idx) => (
                  <li key={idx} className="flex gap-3 text-sm">
                    <span className="text-public-secondary font-bold">D{idx + 1}</span>
                    <span className="text-morandi-primary truncate">{day.title}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Features */}
        <div className="bg-public-primary p-6 rounded-2xl text-white">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle className="w-5 h-5 text-morandi-green" />
            <span className="font-bold">{t('exclusiveService')}</span>
          </div>
          <ul className="text-sm text-white/70 space-y-2">
            <li>• 私人機場接送服務</li>
            <li>• 專業中文嚮導隨行</li>
            <li>• 精選優質住宿</li>
            <li>• 旅遊平安保險</li>
          </ul>
        </div>
      </div>
    </aside>
  )
}
