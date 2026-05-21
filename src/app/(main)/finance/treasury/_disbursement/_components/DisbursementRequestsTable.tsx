'use client'

import React from 'react'
import { EmptyValue } from '@/components/ui/empty-value'
import { CurrencyCell } from '@/components/table-cells'
import { EmptyState } from '@/components/ui/empty-state'
import { PaymentRequest } from '@/stores/types'
import { useExpenseCategories } from '@/data/entities'
import { useTranslations } from 'next-intl'

const COMPONENT_LABELS = {
  TOUR_REQUEST_HEADER: '團體請款 (',
  COMPANY_REQUEST_HEADER: '公司請款 (',
  PAYEE: '付款對象',
  EXPENSE_CATEGORY: '支出類別',
  ITEM_DESCRIPTION: '項目說明',
  SUBTOTAL: '小計',
} as const

interface DisbursementRequestsTableProps {
  tourRequests: PaymentRequest[]
  companyRequests: PaymentRequest[]
}

/**
 * 出納單請款列表
 * 分「團體請款」和「公司請款」兩段顯示
 */
export function DisbursementRequestsTable({
  tourRequests,
  companyRequests,
}: DisbursementRequestsTableProps) {
  const t = useTranslations('finance')
  // 2026-05-21 Phase 2：類別顯示走 expense_categories.id 反查、舊 EXPENSE_TYPE_CONFIG 退休
  const { items: allCats } = useExpenseCategories({ all: true })
  const catNameById = new Map((allCats ?? []).map(c => [c.id, c.name]))
  if (tourRequests.length === 0 && companyRequests.length === 0) {
    return <EmptyState message={t('disbursementNoData')} />
  }

  return (
    <>
      {/* 團體請款 */}
      {tourRequests.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-morandi-primary mb-3">
            {COMPONENT_LABELS.TOUR_REQUEST_HEADER}
            {tourRequests.length} {t('disbursementUnit')})
          </h3>
          <div className="border border-morandi-container/20 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-morandi-gold-header border-b border-border">
                  <th className="text-left py-2.5 px-3 text-xs font-medium text-morandi-primary">
                    {t('disbursementRequestNumber')}
                  </th>
                  <th className="text-left py-2.5 px-3 text-xs font-medium text-morandi-primary">
                    {t('disbursementTourNameTh')}
                  </th>
                  <th className="text-left py-2.5 px-3 text-xs font-medium text-morandi-primary">
                    {COMPONENT_LABELS.PAYEE}
                  </th>
                  <th className="text-left py-2.5 px-3 text-xs font-medium text-morandi-primary">
                    {t('disbursementRequester')}
                  </th>
                  <th className="text-right py-2.5 px-3 text-xs font-medium text-morandi-primary">
                    {t('printAmount')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {tourRequests.map(request => (
                  <tr key={request.id} className="border-b border-morandi-container/10">
                    <td className="py-2 px-3 font-medium text-morandi-primary">{request.code}</td>
                    <td className="py-2 px-3 text-morandi-secondary max-w-[150px] truncate">
                      {request.tour_code
                        ? `${request.tour_code} - ${request.tour_name || ''}`
                        : '-'}
                    </td>
                    <td className="py-2 px-3 text-morandi-secondary">
                      {request.supplier_name || <EmptyValue />}
                    </td>
                    <td className="py-2 px-3 text-morandi-secondary">
                      {request.created_by_name || <EmptyValue />}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <CurrencyCell
                        amount={request.amount || 0}
                        className="font-medium text-morandi-gold"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-morandi-background/50">
                  <td colSpan={4} className="py-2.5 px-3 text-right font-semibold text-sm">
                    {COMPONENT_LABELS.SUBTOTAL}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <CurrencyCell
                      amount={tourRequests.reduce((s, r) => s + (r.amount || 0), 0)}
                      className="font-bold text-morandi-gold"
                    />
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* 公司請款 */}
      {companyRequests.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-morandi-primary mb-3">
            {COMPONENT_LABELS.COMPANY_REQUEST_HEADER}
            {companyRequests.length} {t('disbursementUnit')})
          </h3>
          <div className="border border-morandi-container/20 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-morandi-gold-header border-b border-border">
                  <th className="text-left py-2.5 px-3 text-xs font-medium text-morandi-primary">
                    {t('disbursementRequestNumber')}
                  </th>
                  <th className="text-left py-2.5 px-3 text-xs font-medium text-morandi-primary">
                    {COMPONENT_LABELS.EXPENSE_CATEGORY}
                  </th>
                  <th className="text-left py-2.5 px-3 text-xs font-medium text-morandi-primary">
                    {COMPONENT_LABELS.PAYEE}
                  </th>
                  <th className="text-left py-2.5 px-3 text-xs font-medium text-morandi-primary">
                    {COMPONENT_LABELS.ITEM_DESCRIPTION}
                  </th>
                  <th className="text-right py-2.5 px-3 text-xs font-medium text-morandi-primary">
                    {t('printAmount')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {companyRequests.map(request => (
                  <tr key={request.id} className="border-b border-morandi-container/10">
                    <td className="py-2 px-3 font-medium text-morandi-primary">{request.code}</td>
                    <td className="py-2 px-3 text-morandi-secondary">
                      {/* 優先 expense_category_id 反查、fallback expense_type（舊資料）*/}
                      {(() => {
                        const r = request as PaymentRequest & {
                          expense_category_id?: string | null
                        }
                        return (
                          (r.expense_category_id && catNameById.get(r.expense_category_id)) ||
                          r.expense_type ||
                          '-'
                        )
                      })()}
                    </td>
                    <td className="py-2 px-3 text-morandi-secondary">
                      {request.supplier_name || <EmptyValue />}
                    </td>
                    <td className="py-2 px-3 text-morandi-secondary max-w-[200px] truncate">
                      {request.notes || <EmptyValue />}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <CurrencyCell
                        amount={request.amount || 0}
                        className="font-medium text-morandi-gold"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-morandi-background/50">
                  <td colSpan={4} className="py-2.5 px-3 text-right font-semibold text-sm">
                    {COMPONENT_LABELS.SUBTOTAL}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <CurrencyCell
                      amount={companyRequests.reduce((s, r) => s + (r.amount || 0), 0)}
                      className="font-bold text-morandi-gold"
                    />
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </>
  )
}
