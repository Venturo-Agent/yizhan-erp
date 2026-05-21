'use client'
/**
 * PrintDisbursementPreview
 * 出納單列印預覽組件 — 薄包裝層
 *
 * 子組件：
 * - PrintHeader（頁首）
 * - PrintItemsTable（明細表格，團體/公司共用）
 * - PrintCostTransfer（成本轉移）
 * - PrintFooter（總計 + 頁尾）
 *
 * helper / types：
 * - _utils/printHelpers.ts（processItems / groupByPayFor / splitLargeGroups / TransferPairRow 等）
 */

import { forwardRef, useMemo } from 'react'
import type { DisbursementOrder, PaymentRequest, PaymentRequestItem } from '@/stores/types'
import { useTranslations } from 'next-intl'
import { useAuthStore } from '@/stores/auth-store'
import { useWorkspaceSettings } from '@/hooks/useWorkspaceSettings'
import { logger } from '@/lib/utils/logger'

import { PrintHeader } from './PrintHeader'
import { PrintItemsTable } from './PrintItemsTable'
import { PrintCostTransfer } from './PrintCostTransfer'
import { PrintFooter } from './PrintFooter'
import {
  processItems,
  groupByPayFor,
  splitLargeGroups,
  type TransferPairRow,
} from '../_utils/printHelpers'

interface PrintDisbursementPreviewProps {
  order: DisbursementOrder
  paymentRequests: PaymentRequest[]
  paymentRequestItems: PaymentRequestItem[]
  paymentMethod?: { name: string } | null
  bankAccount?: {
    name: string
    bank_name: string | null
    account_number: string | null
  } | null
}

export const PrintDisbursementPreview = forwardRef<HTMLDivElement, PrintDisbursementPreviewProps>(
  function PrintDisbursementPreview(
    { order, paymentRequests, paymentRequestItems, paymentMethod, bankAccount },
    ref
  ) {
    const t = useTranslations('finance')
    const ws = useWorkspaceSettings()
    const workspaceName = ws.name || useAuthStore.getState().user?.workspace_name || ''
    const companyFullName = ws.legal_name || workspaceName || ''
    const logoUrl = ws.logo_url
    const subtitle = ws.subtitle

    const processedItems = useMemo(
      () => processItems(paymentRequests, paymentRequestItems),
      [paymentRequests, paymentRequestItems]
    )

    // 偵測成本轉移請款單（按 transferred_pair_id、新對沖模式）
    const transferredRequestIds = useMemo(() => {
      const ids = new Set<string>()
      for (const req of paymentRequests) {
        const pairId = (req as unknown as Record<string, unknown>).transferred_pair_id
        if (pairId) ids.add(req.id)
      }
      return ids
    }, [paymentRequests])

    // 分離：團體請款、公司請款（都排除成本轉移 pair requests）
    const companyItems = useMemo(
      () => processedItems.filter(item => item.isCompany && !transferredRequestIds.has(item.requestId)),
      [processedItems, transferredRequestIds]
    )
    const tourItems = useMemo(
      () => processedItems.filter(item => !item.isCompany && !transferredRequestIds.has(item.requestId)),
      [processedItems, transferredRequestIds]
    )

    // 成本轉移 pairs（按 transferred_pair_id 配對兩張請款單）
    const [transferPairs, orphanPairIds] = useMemo<[TransferPairRow[], string[]]>(() => {
      const pairGroups = new Map<string, PaymentRequest[]>()
      for (const req of paymentRequests) {
        const pairId = (req as unknown as Record<string, unknown>).transferred_pair_id as string | undefined
        if (!pairId) continue
        if (!pairGroups.has(pairId)) pairGroups.set(pairId, [])
        pairGroups.get(pairId)!.push(req)
      }

      const rows: TransferPairRow[] = []
      const orphans: string[] = []
      for (const [pairId, reqs] of pairGroups) {
        const src = reqs.find(r => (r.amount || 0) < 0)
        const dst = reqs.find(r => (r.amount || 0) > 0)
        if (!src || !dst) {
          orphans.push(pairId)
          logger.warn(
            `[PrintDisbursementPreview] 孤兒轉移 pair ${pairId}：${
              !src ? '缺 src（amount<0）' : '缺 dst（amount>0）'
            }、共 ${reqs.length} 張 PR、UI 跳過顯示`,
            reqs.map(r => ({ id: r.id, code: r.code, amount: r.amount }))
          )
          continue
        }
        const dstItems = paymentRequestItems
          .filter(i => i.request_id === dst.id)
          .map(i => ({
            description: i.description || '-',
            supplier: i.supplier_name || '-',
            subtotal: i.subtotal || 0,
          }))
        rows.push({
          pairId,
          fromTourCode: src.tour_code || '-',
          fromTourName: src.tour_name || '-',
          toTourCode: dst.tour_code || '-',
          toTourName: dst.tour_name || '-',
          amount: dst.amount || 0,
          items: dstItems,
        })
      }
      return [rows, orphans]
    }, [paymentRequests, paymentRequestItems])

    const companyGroups = useMemo(() => splitLargeGroups(groupByPayFor(companyItems), 5), [companyItems])
    const tourGroups = useMemo(() => splitLargeGroups(groupByPayFor(tourItems), 5), [tourItems])

    const companyTotal = companyItems.reduce((sum, item) => sum + item.amount, 0)
    const tourTotal = tourItems.reduce((sum, item) => sum + item.amount, 0)
    const totalAmount = order.amount || 0
    // 銀行手續費 2026-05-21 加（disbursement_orders.total_fee、generated types 可能還沒 regen、cast 過去）
    const bankFee = Number((order as unknown as { total_fee?: number | null }).total_fee || 0)

    return (
      <div
        ref={ref}
        style={{
          width: '100%',
          minHeight: '400px',
          padding: '32px 28px',
          margin: '0 auto',
          background: 'white',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang TC", "Microsoft JhengHei", sans-serif',
          fontSize: '12px',
          color: '#4B5563',
          boxSizing: 'border-box',
        }}
      >
        <PrintHeader order={order} logoUrl={logoUrl} />

        {tourGroups.length > 0 && (
          <PrintItemsTable
            sectionLabel={t('printTourExpenses')}
            groups={tourGroups}
            subtotalLabel={t('printTourSubtotal')}
            subtotalAmount={tourTotal}
            thirdColHeader={t('printTourName')}
          />
        )}

        {companyGroups.length > 0 && (
          <PrintItemsTable
            sectionLabel={t('printCompanyExpenses')}
            groups={companyGroups}
            subtotalLabel={t('printCompanySubtotal')}
            subtotalAmount={companyTotal}
            thirdColHeader={t('printType')}
          />
        )}

        {tourGroups.length === 0 && companyGroups.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>
            {t('printNoItems')}
          </div>
        )}

        <PrintCostTransfer transferPairs={transferPairs} orphanPairIds={orphanPairIds} />

        <PrintFooter
          totalAmount={totalAmount}
          bankFee={bankFee}
          paymentMethod={paymentMethod}
          bankAccount={bankAccount}
          subtitle={subtitle}
          companyFullName={companyFullName}
        />
      </div>
    )
  }
)
