// 請款總覽表格（從 tour-costs.tsx 抽出）
// 與結案頁相同版型

'use client'

import React, { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { EmptyValue } from '@/components/ui/empty-value'
import { Button } from '@/components/ui/button'
import { Receipt, HandCoins } from 'lucide-react'
import { StatusBadge } from '@/components/ui/status-badge'
import { formatCurrency } from '@/lib/utils/format-currency'
import { AddRequestDialog } from '@/app/(main)/finance/requests/_components/AddRequestDialog'
import type { PaymentRequest } from '@/types/finance.types'
import { usePaymentRequests, useSuppliersSlim } from '@/data'
import type { Tour } from '@/stores/types'

const TABLE_LABELS = {
  TH_NUMBER: '單號',
  TH_DATE: '請款日期',
  TH_CATEGORY: '類別',
  TH_SUPPLIER: '供應商',
  TH_DESCRIPTION: '項目描述',
  TH_UNIT_PRICE: '單價',
  TH_QUANTITY: '數量',
  TH_SUBTOTAL: '小計',
  TH_STATUS: '狀態',
  TH_AMOUNT: '金額',
  EMPTY_PAYMENT_REQUESTS: '尚無請款紀錄',
} as const

interface PaymentRequestOverviewTableProps {
  tour: Tour
}

export function PaymentRequestOverviewTable({ tour }: PaymentRequestOverviewTableProps) {
  const t = useTranslations('tour')
  // server-side filter by tour_id（egress 殺手修復、不再全撈 payment_requests）
  const { items: allPaymentRequests } = usePaymentRequests({
    all: true,
    filter: { tour_id: tour.id },
  })
  const { items: allSuppliers } = useSuppliersSlim({ all: true })
  const [selectedRequest, setSelectedRequest] = useState<PaymentRequest | null>(null)
  const [requestDialogOpen, setRequestDialogOpen] = useState(false)

  const supplierMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const s of allSuppliers ?? []) map[s.id] = s.name
    return map
  }, [allSuppliers])

  const prList = useMemo(
    () =>
      (allPaymentRequests ?? [])
        .filter(pr => pr.tour_id === tour.id)
        .filter(pr => {
          const rt = (pr.request_type || '').toLowerCase()
          return !rt.includes('bonus') && !rt.includes('獎金')
        })
        .sort(
          (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        ),
    [allPaymentRequests, tour.id]
  )

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return '-'
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${month}-${day}`
  }

  const CATEGORY_ORDER = [
    '住宿',
    '交通',
    '餐食',
    '活動',
    '導遊',
    '保險',
    '出團款',
    '回團款',
    '同業',
    '其他',
  ]

  // status 顯示走 SSOT：<StatusBadge type="payment_request" status={pr.status} />

  return (
    <div className="border border-border rounded-lg overflow-x-auto bg-card">
      <div className="px-4 py-2 bg-morandi-red/10 flex items-center gap-2">
        <HandCoins className="w-4 h-4 text-morandi-red" />
        <span className="text-sm font-medium text-morandi-red">
          {t('costsOverviewTitle', { count: prList.length })}
        </span>
      </div>
      <table className="w-full text-sm table-fixed min-w-[900px]">
        {/* 請款欄位多、column 不該被擠：還原業務需要寬度
            加總 100%（避免 table-fixed normalize 拉變形）
            收款 colgroup 配合本表的左半段對齊（方式/付款人/備註 對應 類別/供應商/項目描述）*/}
        <colgroup>
          <col style={{ width: '12%' }} />
          <col style={{ width: '6%' }} />
          <col style={{ width: '8%' }} />
          <col style={{ width: '9%' }} />
          <col style={{ width: '25%' }} />
          <col style={{ width: '8%' }} />
          <col style={{ width: '5%' }} />
          <col style={{ width: '8%' }} />
          <col style={{ width: '10%' }} />
          <col style={{ width: '9%' }} />
        </colgroup>
        <thead>
          <tr className="border-b border-border text-xs text-morandi-secondary">
            <th className="px-4 py-2 text-left font-medium">{TABLE_LABELS.TH_NUMBER}</th>
            <th className="px-4 py-2 text-left font-medium">{TABLE_LABELS.TH_DATE}</th>
            <th className="px-4 py-2 text-left font-medium">{TABLE_LABELS.TH_CATEGORY}</th>
            <th className="px-4 py-2 text-left font-medium">{TABLE_LABELS.TH_SUPPLIER}</th>
            <th className="px-4 py-2 text-left font-medium">{TABLE_LABELS.TH_DESCRIPTION}</th>
            <th className="px-4 py-2 text-right font-medium">{TABLE_LABELS.TH_UNIT_PRICE}</th>
            <th className="px-4 py-2 text-right font-medium">{TABLE_LABELS.TH_QUANTITY}</th>
            <th className="px-4 py-2 text-right font-medium">{TABLE_LABELS.TH_SUBTOTAL}</th>
            <th className="px-4 py-2 text-center font-medium">{TABLE_LABELS.TH_STATUS}</th>
            <th className="px-4 py-2 text-right font-medium">{TABLE_LABELS.TH_AMOUNT}</th>
          </tr>
        </thead>
        <tbody>
          {prList.length > 0 ? (
            prList.map(pr => {
              const rawItems =
                (
                  pr as unknown as {
                    items?: Array<{
                      id?: string
                      category?: string
                      supplier_id?: string
                      supplier_name?: string
                      description?: string
                      unit_price?: number
                      quantity?: number
                      subtotal?: number
                    }>
                  }
                ).items ?? []
              const items = [...rawItems].sort((a, b) => {
                const ai = CATEGORY_ORDER.indexOf(a.category || '')
                const bi = CATEGORY_ORDER.indexOf(b.category || '')
                return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
              })
              if (items.length === 0) {
                return (
                  <tr
                    key={pr.id}
                    className="border-b border-border last:border-b-0 hover:bg-morandi-bg/50"
                  >
                    <td className="px-4 py-2 font-medium text-morandi-primary">
                      <Button
                        type="button"
                        variant="link"
                        className="h-auto p-0 text-morandi-gold hover:text-morandi-gold-hover hover:underline"
                        onClick={() => {
                          setSelectedRequest(pr as unknown as PaymentRequest)
                          setRequestDialogOpen(true)
                        }}
                      >
                        {pr.code || <EmptyValue />}
                      </Button>
                    </td>
                    <td className="px-4 py-2 text-morandi-secondary">
                      {formatDate(pr.request_date)}
                    </td>
                    <td className="px-4 py-2 text-morandi-secondary">
                      {pr.request_type || <EmptyValue />}
                    </td>
                    <td className="px-4 py-2 text-morandi-secondary">
                      {pr.supplier_name || <EmptyValue />}
                    </td>
                    <td className="px-4 py-2 text-morandi-secondary">
                      {pr.notes || <EmptyValue />}
                    </td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums text-morandi-secondary">
                      -
                    </td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums text-morandi-secondary">
                      -
                    </td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums text-morandi-secondary">
                      -
                    </td>
                    <td className="px-4 py-2 text-center">
                      <StatusBadge type="payment_request" status={pr.status || ''} />
                    </td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums text-morandi-red font-medium">
                      -{formatCurrency(Number(pr.amount) || 0)}
                    </td>
                  </tr>
                )
              }

              return items.map((item, idx) => (
                <tr
                  key={`${pr.id}-${item.id || idx}`}
                  className="border-b border-border last:border-b-0 hover:bg-morandi-bg/50"
                >
                  {idx === 0 ? (
                    <>
                      <td
                        className="px-4 py-2 font-medium text-morandi-primary"
                        rowSpan={items.length}
                      >
                        <Button
                          type="button"
                          variant="link"
                          className="h-auto p-0 text-morandi-gold hover:text-morandi-gold-hover hover:underline"
                          onClick={() => {
                            setSelectedRequest(pr as unknown as PaymentRequest)
                            setRequestDialogOpen(true)
                          }}
                        >
                          {pr.code || <EmptyValue />}
                        </Button>
                      </td>
                      <td className="px-4 py-2 text-morandi-secondary" rowSpan={items.length}>
                        {formatDate(pr.request_date)}
                      </td>
                    </>
                  ) : null}
                  <td className="px-4 py-2 text-morandi-secondary">
                    {item.category || <EmptyValue />}
                  </td>
                  <td className="px-4 py-2 text-morandi-secondary">
                    {(item.supplier_id && supplierMap[item.supplier_id]) ||
                      item.supplier_name ||
                      '-'}
                  </td>
                  <td className="px-4 py-2 text-morandi-secondary">
                    {item.description || <EmptyValue />}
                  </td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums text-morandi-secondary">
                    {formatCurrency(item.unit_price ?? 0)}
                  </td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums text-morandi-secondary">
                    {item.quantity ?? '-'}
                  </td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums text-morandi-secondary">
                    {formatCurrency(item.subtotal ?? 0)}
                  </td>
                  {idx === 0 ? (
                    <>
                      <td className="px-4 py-2 text-center" rowSpan={items.length}>
                        <StatusBadge type="payment_request" status={pr.status || ''} />
                      </td>
                      <td
                        className="px-4 py-2 text-right font-mono tabular-nums text-morandi-red font-medium"
                        rowSpan={items.length}
                      >
                        -{formatCurrency(Number(pr.amount) || 0)}
                      </td>
                    </>
                  ) : null}
                </tr>
              ))
            })
          ) : (
            <tr>
              <td colSpan={10} className="py-12 text-center text-morandi-secondary">
                <Receipt size={24} className="mx-auto mb-4 opacity-50" />
                <p>{TABLE_LABELS.EMPTY_PAYMENT_REQUESTS}</p>
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <AddRequestDialog
        open={requestDialogOpen}
        onOpenChange={setRequestDialogOpen}
        editingRequest={selectedRequest}
      />
    </div>
  )
}
