'use client'

/**
 * /hr/bonus-settlement/[tourId]
 *
 * 看單一 tour 的獎金 detail（員工 row）。唯讀。
 */

import { use, useEffect, useState, useCallback } from 'react'
import { Award, Loader2 } from 'lucide-react'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'

interface BonusItem {
  id: string
  employee_id: string
  employee_name: string
  amount: number
  bonus_kind: string | null
  reason: string | null
  status: 'pending' | 'settled' | 'cancelled'
  settled_at: string | null
  settled_in_payment_request_id: string | null
}

interface TourMeta {
  id: string
  code: string | null
  name: string
  closing_date: string | null
  status: string | null
}

function formatNT(n: number): string {
  return `NT$ ${Number(n).toLocaleString('zh-TW')}`
}

const STATUS_BADGE = {
  pending: { label: '待結算', className: 'bg-morandi-muted/20 text-morandi-secondary' },
  settled: { label: '已結算', className: 'bg-morandi-green/20 text-morandi-green' },
  cancelled: { label: '已取消', className: 'bg-red-100 text-red-700' },
} as const

export default function BonusSettlementTourDetailPage({
  params,
}: {
  params: Promise<{ tourId: string }>
}) {
  const { tourId } = use(params)
  const [tour, setTour] = useState<TourMeta | null>(null)
  const [items, setItems] = useState<BonusItem[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/hr/bonus-settlements/${tourId}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        toast.error(body.error || `載入失敗 HTTP ${res.status}`)
        return
      }
      const body = await res.json()
      setTour(body.data.tour)
      setItems(body.data.items ?? [])
    } catch (err) {
      logger.error('Load tour bonus detail failed:', err)
      toast.error('載入失敗')
    } finally {
      setLoading(false)
    }
  }, [tourId])

  useEffect(() => {
    load()
  }, [load])

  const totalAmount = items.reduce((sum, it) => sum + Number(it.amount ?? 0), 0)

  if (loading) {
    return (
      <ContentPageLayout
        title="獎金明細"
        icon={Award}
        breadcrumb={[
          { label: '人資管理', href: '/hr' },
          { label: '獎金結算', href: '/hr/bonus-settlement' },
        ]}
      >
        <div className="flex items-center justify-center py-12 text-morandi-secondary">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          載入中...
        </div>
      </ContentPageLayout>
    )
  }

  if (!tour) {
    return (
      <ContentPageLayout
        title="獎金明細"
        icon={Award}
        breadcrumb={[
          { label: '人資管理', href: '/hr' },
          { label: '獎金結算', href: '/hr/bonus-settlement' },
        ]}
      >
        <Card className="p-12 text-center text-morandi-secondary">找不到團</Card>
      </ContentPageLayout>
    )
  }

  return (
    <ContentPageLayout
      title={tour.code || '獎金明細'}
      icon={Award}
      breadcrumb={[
        { label: '人資管理', href: '/hr' },
        { label: '獎金結算', href: '/hr/bonus-settlement' },
        { label: tour.code || tourId.slice(0, 8), href: `/hr/bonus-settlement/${tourId}` },
      ]}
    >
      {/* 摘要 */}
      <Card className="p-5 mb-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <h3 className="text-base font-semibold text-morandi-primary">{tour.name}</h3>
            <div className="text-xs text-morandi-muted mt-1 flex items-center gap-3">
              {tour.code && <span>團號：{tour.code}</span>}
              {tour.closing_date && <span>結團 {tour.closing_date.slice(0, 10)}</span>}
              <span>{items.length} 筆獎金</span>
              <span className="text-morandi-gold font-semibold">{formatNT(totalAmount)}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* 員工列表 */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-morandi-container/30">
              <tr className="text-left text-xs text-morandi-secondary">
                <th className="px-4 py-3">員工</th>
                <th className="px-4 py-3">類型</th>
                <th className="px-4 py-3">狀態</th>
                <th className="px-4 py-3 text-right">金額</th>
                <th className="px-4 py-3">備註</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => {
                const badge = STATUS_BADGE[it.status]
                return (
                  <tr key={it.id} className="border-t border-morandi-muted/10">
                    <td className="px-4 py-3 font-medium text-morandi-primary">
                      {it.employee_name}
                    </td>
                    <td className="px-4 py-3 text-morandi-secondary">{it.bonus_kind || '—'}</td>
                    <td className="px-4 py-3">
                      <Badge className={badge.className}>{badge.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-morandi-gold">
                      {formatNT(it.amount)}
                    </td>
                    <td className="px-4 py-3 text-xs text-morandi-muted">{it.reason || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </ContentPageLayout>
  )
}
