'use client'

/**
 * 公開報名頁面
 * 路由: /p/tour/[code]/register?ref=E001
 */

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ArrowLeft, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ModuleLoading } from '@/components/module-loading'
import { TourRegistrationForm } from '../_components/tour-registration-form'

interface TourBasicInfo {
  id: string
  code: string
  name: string
  departure_date: string | null
  selling_price_per_person: number | null
}

export default function RegisterPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const t = useTranslations('publicPage')
  const { code } = use(params)
  const searchParams = useSearchParams()
  const ref = searchParams.get('ref')

  const [tour, setTour] = useState<TourBasicInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    const fetchTour = async () => {
      try {
        const response = await fetch(`/api/public/tour/${code}`)
        const result = await response.json()

        if (result.success && result.data) {
          setTour({
            id: result.data.id,
            code: result.data.code,
            name: result.data.name,
            departure_date: result.data.departureDate,
            selling_price_per_person: result.data.price,
          })
        } else {
          setNotFound(true)
        }
      } catch {
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }

    fetchTour()
  }, [code])

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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link
              href={`/p/tour/${code}${ref ? `?ref=${ref}` : ''}`}
              className="flex items-center gap-2 text-morandi-primary hover:text-morandi-accent transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>返回行程</span>
            </Link>
            <div className="text-sm text-morandi-secondary">
              {ref && <span className="text-morandi-green">業務員引導</span>}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-6 py-12">
        {/* Tour Info */}
        <div className="mb-8">
          <div className="text-xs font-bold text-morandi-secondary uppercase tracking-widest mb-2">
            報名行程
          </div>
          <h1 className="text-2xl font-bold text-morandi-primary mb-2">
            {tour.name}
          </h1>
          {tour.departure_date && (
            <p className="text-morandi-secondary">
              出發日期：{new Date(tour.departure_date).toLocaleDateString('zh-TW', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          )}
          {tour.selling_price_per_person && (
            <p className="text-lg font-bold text-morandi-accent mt-2">
              TWD {tour.selling_price_per_person.toLocaleString()} / 人
            </p>
          )}
        </div>

        {/* Benefits */}
        <div className="bg-morandi-container/30 rounded-xl p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle className="w-5 h-5 text-morandi-green" />
            <span className="font-bold text-morandi-primary">報名保障</span>
          </div>
          <ul className="text-sm text-morandi-secondary space-y-2">
            <li>• 專業旅遊顧問一對一服務</li>
            <li>• 機票、住宿全程幫您安排</li>
            <li>• 旅遊平安保險完整保障</li>
          </ul>
        </div>

        {/* Registration Form */}
        <div className="bg-card rounded-2xl p-8 shadow-sm border border-border">
          <h2 className="text-xl font-bold text-morandi-primary mb-6">
            填寫報名資料
          </h2>
          <TourRegistrationForm
            tourId={tour.id}
            tourCode={tour.code}
            salesRef={ref}
          />
        </div>

        {/* Note */}
        <p className="text-xs text-morandi-muted text-center mt-6">
          提交報名後，我們將於 24 小時內與您聯繫確認
        </p>
      </main>
    </div>
  )
}