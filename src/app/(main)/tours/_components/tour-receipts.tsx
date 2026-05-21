'use client'

/**
 * TourReceipts - 收款總覽表格（與 TourCosts 請款總覽成對）
 *
 * 使用場景：
 * - 旅遊團 詳情頁「總覽」分頁 → 顯示請款 + 收款
 * - 旅遊團 詳情頁「結案」分頁 → 同上
 *
 * 補回（258d6220c cleanup 把 tour-payments 砍掉後、總覽頁收款明細消失）。
 */

import React, { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { EmptyValue } from '@/components/ui/empty-value'
import { TrendingUp } from 'lucide-react'
import type { Tour } from '@/stores/types'
import type { Receipt } from '@/types/receipt.types'
import { useReceipts } from '@/data'
import { usePaymentMethodsCached } from '@/data/hooks'
import { formatCurrency } from '@/lib/utils/format-currency'
import { AddReceiptDialog } from '@/app/(main)/finance/payments/_components/AddReceiptDialog'
import { StatusBadge } from '@/components/ui/status-badge'

const COMPONENT_LABELS = {
  TH_NUMBER: '單號',
  TH_DATE: '收款日期',
  TH_METHOD: '收款方式',
  TH_PAYER: '付款人',
  TH_REMARK: '備註',
  TH_PENDING_AMOUNT: '待核金額',
  TH_STATUS: '狀態',
  TH_AMOUNT: '金額',
  EMPTY_RECEIPTS: '尚無收款紀錄',
} as const

interface TourReceiptsProps {
  tour: Tour
  /** 選填：只顯示特定訂單相關的收款 */
  orderFilter?: string
}

const PAYMENT_METHOD_FALLBACK_LABELS: Record<string, string> = {
  transfer: '匯款',
  cash: '現金',
  card: '刷卡',
  check: '支票',
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '-'
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${month}-${day}`
}

export const TourReceipts = React.memo(function TourReceipts({
  tour,
  orderFilter,
}: TourReceiptsProps) {
  const t = useTranslations('tour')
  // 注意：useReceipts({ filter }) 的 filter 參數目前被 createEntityHook.useList silently drop
  // 暫時 client side filter；長期應修 createEntityHook 真正支援 server-side filter
  const { items: allReceipts } = useReceipts({ all: true, filter: { tour_id: tour.id } })
  const { methods: allPaymentMethods } = usePaymentMethodsCached()
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const receipts = useMemo(
    () =>
      (allReceipts ?? [])
        .filter(r => r.tour_id === tour.id)
        .filter(r => r.is_active !== false)
        .filter(r => !orderFilter || r.order_id === orderFilter)
        .sort(
          (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        ),
    [allReceipts, tour.id, orderFilter]
  )

  const paymentMethodMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const pm of allPaymentMethods) map[pm.id] = pm.name
    return map
  }, [allPaymentMethods])

  const resolveMethodLabel = (r: Receipt) => {
    if (r.payment_method_id && paymentMethodMap[r.payment_method_id]) {
      return paymentMethodMap[r.payment_method_id]
    }
    return PAYMENT_METHOD_FALLBACK_LABELS[r.payment_method] || r.payment_method || '-'
  }

  return (
    <div className="border border-border rounded-lg overflow-x-auto bg-card">
      <div className="px-4 py-2 bg-morandi-green/10 flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-morandi-green" />
        <span className="text-sm font-medium text-morandi-green">
          {t('receiptsOverviewTitle', { count: receipts.length })}
        </span>
      </div>
      <table className="w-full text-sm table-fixed" style={{ minWidth: 900 }}>
        <colgroup>
          <col style={{ width: '12%' }} />
          <col style={{ width: '8%' }} />
          <col style={{ width: '10%' }} />
          <col style={{ width: '14%' }} />
          <col style={{ width: '22%' }} />
          <col style={{ width: '12%' }} />
          <col style={{ width: '10%' }} />
          <col style={{ width: '12%' }} />
        </colgroup>
        <thead>
          <tr className="border-b border-border text-xs text-morandi-secondary">
            <th className="px-4 py-2 text-left font-medium">{COMPONENT_LABELS.TH_NUMBER}</th>
            <th className="px-4 py-2 text-left font-medium">{COMPONENT_LABELS.TH_DATE}</th>
            <th className="px-4 py-2 text-left font-medium">{COMPONENT_LABELS.TH_METHOD}</th>
            <th className="px-4 py-2 text-left font-medium">{COMPONENT_LABELS.TH_PAYER}</th>
            <th className="px-4 py-2 text-left font-medium">{COMPONENT_LABELS.TH_REMARK}</th>
            <th className="px-4 py-2 text-right font-medium">{COMPONENT_LABELS.TH_PENDING_AMOUNT}</th>
            <th className="px-4 py-2 text-center font-medium">{COMPONENT_LABELS.TH_STATUS}</th>
            <th className="px-4 py-2 text-right font-medium">{COMPONENT_LABELS.TH_AMOUNT}</th>
          </tr>
        </thead>
        <tbody>
          {receipts.length > 0 ? (
            receipts.map(r => {
              const amount = Number(r.actual_amount) || Number(r.receipt_amount) || 0
              return (
                <tr
                  key={r.id}
                  className="border-b border-border last:border-b-0 hover:bg-morandi-bg/50"
                >
                  <td className="px-4 py-2 font-medium text-morandi-primary">
                    <Button
                      type="button"
                      variant="link"
                      className="h-auto p-0 text-morandi-gold hover:text-morandi-gold-hover hover:underline"
                      onClick={() => {
                        setSelectedReceipt(r)
                        setDialogOpen(true)
                      }}
                    >
                      {r.receipt_number || <EmptyValue />}
                    </Button>
                  </td>
                  <td className="px-4 py-2 text-morandi-secondary">{formatDate(r.receipt_date)}</td>
                  <td className="px-4 py-2 text-morandi-secondary">{resolveMethodLabel(r)}</td>
                  <td className="px-4 py-2 text-morandi-secondary">{r.receipt_account || <EmptyValue />}</td>
                  <td className="px-4 py-2 text-morandi-secondary">{r.notes || <EmptyValue />}</td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums text-morandi-red font-medium">
                    {/* 待核金額：pending / pending_verify 才顯示、會計核准後就空 */}
                    {r.status === 'pending' || r.status === 'pending_verify' ? (
                      <>{formatCurrency(amount)}</>
                    ) : (
                      <EmptyValue />
                    )}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <StatusBadge type="receipt" status={r.status || ''} />
                  </td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums text-morandi-green font-medium">
                    {/* 金額：confirmed（已勾稽）才顯示、pending 期間留空 */}
                    {r.status === 'confirmed' ? (
                      <>+{formatCurrency(amount)}</>
                    ) : (
                      <EmptyValue />
                    )}
                  </td>
                </tr>
              )
            })
          ) : (
            <tr>
              <td colSpan={8} className="py-12 text-center text-morandi-secondary">
                <TrendingUp size={24} className="mx-auto mb-4 opacity-50" />
                <p>{COMPONENT_LABELS.EMPTY_RECEIPTS}</p>
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <AddReceiptDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingReceipt={selectedReceipt}
      />
    </div>
  )
})
