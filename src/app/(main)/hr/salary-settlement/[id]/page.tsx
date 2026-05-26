'use client'

/**
 * /hr/salary-settlement/[id]
 *
 * 薪資結算 detail 頁、顯示員工列表 + 「確認」按鈕（draft 狀態）
 */

import { use, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Wallet, Check, Loader2, Trash2 } from 'lucide-react'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { confirm } from '@/lib/ui/alert-dialog'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import { apiMutate } from '@/lib/swr/api-mutate'

interface SettlementItem {
  id: string
  employee_id: string
  employee_name: string
  employee_number: string | null
  base_salary: number
  allowances: number
  attendance_bonus: number
  other_allowances: number
  deductions: number
  total_amount: number
  breakdown?: {
    calc?: {
      insured_salary?: number
      labor_insured_here?: boolean
      pension_employer?: number
      pension_voluntary?: number
      pension_voluntary_rate?: number
      gross_pay?: number
      net_pay?: number
      company_total_cost?: number
    }
  } | null
}

interface SettlementDetail {
  id: string
  period: string
  status: 'draft' | 'submitted' | 'cancelled'
  total_amount: number
  employee_count: number
  payment_request_id: string | null
  notes: string | null
  submitted_at: string | null
  created_at: string
  items: SettlementItem[]
}

function formatNT(n: number): string {
  return `NT$ ${Number(n).toLocaleString('zh-TW')}`
}

const STATUS_BADGE = {
  draft: { label: '草稿（未確認）', className: 'bg-morandi-muted/20 text-morandi-secondary' },
  submitted: { label: '已確認', className: 'bg-morandi-green/20 text-morandi-green' },
  cancelled: { label: '已取消', className: 'bg-red-100 text-red-700' },
} as const

export default function SalarySettlementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const [detail, setDetail] = useState<SettlementDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/hr/salary-settlements/${id}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        toast.error(body.error || `載入失敗 HTTP ${res.status}`)
        return
      }
      const body = await res.json()
      setDetail(body.data)
    } catch (err) {
      logger.error('Load detail failed:', err)
      toast.error('載入失敗')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const handleSubmit = async () => {
    const ok = await confirm(
      `確認後會產出請款單、不可再修改。${detail?.period} 薪資（${detail?.employee_count} 員工、${formatNT(
        detail?.total_amount ?? 0
      )}）`,
      { title: '確認薪資結算？' }
    )
    if (!ok) return

    setSubmitting(true)
    try {
      const res = await apiMutate<{ data: { payment_request_code: string } }>(
        `/api/hr/salary-settlements/${id}/submit`,
        {
          method: 'POST',
          invalidate: [`/api/hr/salary-settlements/${id}`, '/api/hr/salary-settlements'],
        }
      )
      if (!res.ok || !res.data) {
        toast.error(res.error || `確認失敗 HTTP ${res.status}`)
        return
      }
      toast.success(`已確認、請款單 ${res.data.data.payment_request_code}`)
      load()
    } catch (err) {
      logger.error('Submit failed:', err)
      toast.error('確認失敗')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    const ok = await confirm('草稿刪除後無法復原。', { title: '確認刪除草稿？' })
    if (!ok) return

    try {
      const res = await apiMutate(`/api/hr/salary-settlements/${id}`, {
        method: 'DELETE',
        invalidate: ['/api/hr/salary-settlements'],
      })
      if (!res.ok) {
        toast.error(res.error || '刪除失敗')
        return
      }
      toast.success('已刪除')
      router.push('/hr/salary-settlement')
    } catch (err) {
      logger.error('Delete failed:', err)
      toast.error('刪除失敗')
    }
  }

  if (loading) {
    return (
      <ContentPageLayout
        title="薪資結算"
        icon={Wallet}
        breadcrumb={[
          { label: '人資管理', href: '/hr' },
          { label: '薪資結算', href: '/hr/salary-settlement' },
        ]}
      >
        <div className="flex items-center justify-center py-12 text-morandi-secondary">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          載入中...
        </div>
      </ContentPageLayout>
    )
  }

  if (!detail) {
    return (
      <ContentPageLayout
        title="薪資結算"
        icon={Wallet}
        breadcrumb={[
          { label: '人資管理', href: '/hr' },
          { label: '薪資結算', href: '/hr/salary-settlement' },
        ]}
      >
        <Card className="p-12 text-center text-morandi-secondary">找不到結算紀錄</Card>
      </ContentPageLayout>
    )
  }

  const badge = STATUS_BADGE[detail.status]

  return (
    <ContentPageLayout
      title={`${detail.period} 薪資`}
      icon={Wallet}
      primaryAction={
        detail.status === 'draft'
          ? {
              label: submitting ? '確認中...' : '確認結算',
              icon: Check,
              onClick: handleSubmit,
              disabled: submitting,
            }
          : undefined
      }
      breadcrumb={[
        { label: '人資管理', href: '/hr' },
        { label: '薪資結算', href: '/hr/salary-settlement' },
        { label: detail.period, href: `/hr/salary-settlement/${id}` },
      ]}
    >
      {/* 摘要卡 */}
      <Card className="p-5 mb-4">
        <div className="flex items-center gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <Badge className={badge.className}>{badge.label}</Badge>
              <span className="text-xs text-morandi-muted">
                建立 {detail.created_at.slice(0, 10)}
              </span>
              {detail.submitted_at && (
                <span className="text-xs text-morandi-muted">
                  確認 {detail.submitted_at.slice(0, 10)}
                </span>
              )}
            </div>
            <div className="text-sm text-morandi-secondary flex items-center gap-4">
              <span>{detail.employee_count} 位員工</span>
              <span className="text-morandi-gold font-semibold text-base">
                {formatNT(detail.total_amount)}
              </span>
              {detail.payment_request_id && (
                <span className="text-xs">
                  · 請款單：
                  <a href={`/finance/requests`} className="text-morandi-gold underline">
                    查看
                  </a>
                </span>
              )}
            </div>
            {detail.notes && (
              <p className="text-xs text-morandi-muted mt-2">備註：{detail.notes}</p>
            )}
          </div>
          {detail.status === 'draft' && (
            <Button variant="ghost" size="sm" onClick={handleDelete} className="text-red-600">
              <Trash2 className="w-4 h-4 mr-1" />
              刪除草稿
            </Button>
          )}
        </div>
      </Card>

      {/* 員工列表 — 2026-05-15 加勞退 / 自願提撥欄位 */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-morandi-container/30">
              <tr className="text-left text-xs text-morandi-secondary">
                <th className="px-4 py-3">員工</th>
                <th className="px-4 py-3 text-right">應發</th>
                <th className="px-4 py-3 text-right">自願提撥</th>
                <th className="px-4 py-3 text-right font-semibold">實領</th>
                <th className="px-4 py-3 text-right text-morandi-secondary">雇主勞退</th>
                <th className="px-4 py-3 text-right text-morandi-secondary">公司支出</th>
              </tr>
            </thead>
            <tbody>
              {detail.items.map(it => {
                const calc = it.breakdown?.calc ?? {}
                const grossPay = calc.gross_pay ?? it.total_amount + it.deductions
                const pensionVol = calc.pension_voluntary ?? 0
                const netPay = calc.net_pay ?? it.total_amount
                const pensionEmp = calc.pension_employer ?? 0
                const companyCost = calc.company_total_cost ?? grossPay + pensionEmp
                return (
                  <tr key={it.id} className="border-t border-morandi-muted/10">
                    <td className="px-4 py-3">
                      <div className="font-medium text-morandi-primary">{it.employee_name}</div>
                      {it.employee_number && (
                        <div className="text-xs text-morandi-muted">{it.employee_number}</div>
                      )}
                      {calc.labor_insured_here === false && (
                        <div className="text-[0.588rem] text-orange-600">⚠ 勞保不在本公司</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatNT(grossPay)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-red-600">
                      {pensionVol > 0 ? `-${formatNT(pensionVol)}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-morandi-gold">
                      {formatNT(netPay)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-morandi-secondary">
                      {pensionEmp > 0 ? formatNT(pensionEmp) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-morandi-secondary">
                      {formatNT(companyCost)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot className="bg-morandi-container/20">
              <tr className="border-t-2 border-morandi-muted/30">
                <td className="px-4 py-3 font-semibold text-morandi-primary" colSpan={3}>
                  合計（{detail.employee_count} 位、員工實領總額）
                </td>
                <td className="px-4 py-3 text-right tabular-nums font-bold text-morandi-gold">
                  {formatNT(detail.total_amount)}
                </td>
                <td
                  className="px-4 py-3 text-right tabular-nums font-semibold text-morandi-secondary"
                  colSpan={2}
                >
                  公司支出總計：
                  {formatNT(
                    detail.items.reduce(
                      (sum, it) =>
                        sum + (it.breakdown?.calc?.company_total_cost ?? it.total_amount),
                      0
                    )
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      <p className="text-xs text-morandi-muted mt-3">
        ※ 目前計算：雇主強制勞退 6% + 員工自願提撥（0-6%、員工設定）。健保扣款待 Phase 2 上線。
        勞保不在本公司的員工 → 不計算雇主勞退（員工自己另投）。
      </p>

      {detail.status === 'draft' && (
        <p className="text-xs text-morandi-muted mt-3">
          ※ 草稿狀態：金額不可修改。要改員工薪資、請去人資管理改員工資料、再砍此草稿重建。
        </p>
      )}
    </ContentPageLayout>
  )
}
