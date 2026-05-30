'use client'

/**
 * TourClosingSections — 結案專屬區塊（嵌進總覽分頁）
 *
 * 設計：
 * - closing-only 的部分（利潤計算表 + 獎金明細 + 結案狀況）獨立成可嵌入「總覽」分頁的 sections
 * - 上層在 TourTabs 用 workspace feature 開關（`tours.closing`）決定要不要 mount
 *   → 沒開的 workspace 不會 fetch 這些資料、不會看到這 3 段
 * - 「總覽」的 TourOverview / TourReceipts / TourCosts 不重複、留在外面
 */

import { useMemo, useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { mutate as globalMutate } from '@/lib/swr/scoped-mutate'
import { Unlock, FileDown, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import type { Tour } from '@/stores/types'
import { ProfitTab } from './ProfitTab'
import { BonusSettingsDialog } from './BonusSettingsDialog'
import { ClosingReportDialog } from './ClosingReportDialog'
import { ReopenClosedTourDialog } from './ReopenClosedTourDialog'
import { useCapabilities, CAPABILITIES } from '@/lib/permissions'
import { invalidateTours } from '@/data'
import {
  useReceipts,
  usePaymentRequests,
  useTourBonusSettings,
  useEmployeeDictionary,
  useMembers,
  useOrdersSlim,
  updateTour,
} from '@/data'
import { calculateFullProfit } from '../_services/profit-calculation.service'
import { generateBonusPaymentRequest } from '../_services/bonus-payment.service'
import { invalidatePaymentRequests, invalidateTourBonusSettings } from '@/data'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores'
import { TOUR_STATUS } from '@/lib/constants/status-maps'
import { BonusSettingType } from '@/types/bonus.types'
import { BONUS_TYPE_LABELS } from '../_constants/bonus-labels'
import type { PrintTourClosingPreviewProps } from './PrintTourClosingPreview'

import { Spinner } from '@/components/ui/spinner'
import { apiMutate } from '@/lib/swr/api-mutate'
const COMPONENT_LABELS = {
  STATUS_UPDATE_FAILED: '狀態更新失敗',
  CLOSE_TOUR_FAILED: '結案失敗、請再試一次',
  CLOSING_STATUS: '結案狀態',
} as const

interface TourClosingSectionsProps {
  tour: Tour
}

export function TourClosingSections({ tour }: TourClosingSectionsProps) {
  const t = useTranslations('tour')
  const [bonusDialogOpen, setBonusDialogOpen] = useState(false)
  const [reportDialogOpen, setReportDialogOpen] = useState(false)
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [reopenDialogOpen, setReopenDialogOpen] = useState(false)
  const { can } = useCapabilities()
  const canReopenClosed = can(CAPABILITIES.TOURS_REOPEN_CLOSED)

  // server-side filter by tour_id（egress 殺手修復、不再全撈）
  const { items: allReceipts } = useReceipts({ all: true, filter: { tour_id: tour.id } })
  const { items: allPaymentRequests } = usePaymentRequests({
    all: true,
    filter: { tour_id: tour.id },
  })
  const { items: allBonusSettings } = useTourBonusSettings({
    all: true,
    filter: { tour_id: tour.id },
  })
  const { items: allMembers } = useMembers({ all: true })
  const { items: allOrders } = useOrdersSlim({ all: true, filter: { tour_id: tour.id } })
  const { get: getEmployee } = useEmployeeDictionary()
  const { user } = useAuthStore()

  const orders = useMemo(
    () => (allOrders ?? []).filter(o => o.tour_id === tour.id),
    [allOrders, tour.id]
  )
  const orderIds = useMemo(() => new Set(orders.map(o => o.id)), [orders])

  const receipts = useMemo(
    () =>
      (allReceipts ?? [])
        .filter(r => r.tour_id === tour.id || (r.order_id && orderIds.has(r.order_id)))
        .sort(
          (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        ),
    [allReceipts, tour.id, orderIds]
  )

  const paymentRequests = useMemo(
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

  const bonusSettings = useMemo(
    () => (allBonusSettings ?? []).filter(s => s.tour_id === tour.id),
    [allBonusSettings, tour.id]
  )

  const memberCount = useMemo(
    () => (allMembers ?? []).filter(m => m.order_id && orderIds.has(m.order_id)).length,
    [allMembers, orderIds]
  )

  const employeeDict = useMemo(() => {
    const dict: Record<string, string> = {}
    for (const s of bonusSettings) {
      if (s.employee_id) {
        const emp = getEmployee(s.employee_id)
        dict[s.employee_id] = emp?.display_name || emp?.chinese_name || s.employee_id
      }
    }
    return dict
  }, [bonusSettings, getEmployee])

  const isClosed = tour.status === TOUR_STATUS.CLOSED
  const statusInfo = isClosed
    ? { label: '已結案', color: 'bg-status-success/20 text-status-success' }
    : { label: '未結案', color: 'bg-morandi-gold/20 text-morandi-gold' }

  // 結案：未結案 → 已結案（合法、走 updateTour）
  const handleMarkAsClosed = useCallback(async () => {
    setStatusUpdating(true)
    try {
      await updateTour(tour.id, {
        status: TOUR_STATUS.CLOSED,
        closing_date: new Date().toISOString(),
      })
      // 團詳情頁用另一條 cache key (`tour-${id}`)、要手動 invalidate
      await globalMutate(`tour-${tour.id}`)
      toast.success('已標記為結案')
    } catch (err) {
      logger.error('更新結案狀態失敗', err)
      toast.error(COMPONENT_LABELS.STATUS_UPDATE_FAILED)
    } finally {
      setStatusUpdating(false)
    }
  }, [tour.id])

  // 強制重開：已結案 → 未結案
  // DB trigger 守門擋下直接 UPDATE、必須走 reopen_closed_tour RPC：
  //   - 後端 capability check（tours.reopen_closed）
  //   - 後端強制必填原因
  //   - 後端記錄 tour_status_logs.is_force_reopen=true + reopen_reason
  const handleConfirmReopen = useCallback(
    async (reason: string) => {
      setStatusUpdating(true)
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any).rpc('reopen_closed_tour', {
          _tour_id: tour.id,
          _reason: reason,
        })
        if (error) throw error
        await Promise.all([globalMutate(`tour-${tour.id}`), invalidateTours()])
        toast.success('已強制重開、改回「未結案」')
        setReopenDialogOpen(false)
      } catch (err) {
        logger.error('強制重開失敗', err)
        const message = err instanceof Error ? err.message : ''
        if (message.includes('權限不足')) {
          toast.error('權限不足、需主管專屬「強制重開」權限')
        } else {
          toast.error('強制重開失敗、請再試一次')
        }
      } finally {
        setStatusUpdating(false)
      }
    },
    [tour.id]
  )

  // 對外的「切換結案狀態」入口（按鈕點擊）
  const handleToggleClosingStatus = useCallback(() => {
    if (isClosed) {
      // 強制重開走對話框（要原因 + capability）
      if (!canReopenClosed) {
        toast.error('權限不足、需主管專屬「強制重開」權限')
        return
      }
      setReopenDialogOpen(true)
      return
    }
    // 結案直接做
    void handleMarkAsClosed()
  }, [isClosed, canReopenClosed, handleMarkAsClosed])

  // 結案報告資料（給 ClosingReportDialog 用）
  const reportData: PrintTourClosingPreviewProps = useMemo(() => {
    const adaptedReceipts = receipts.map(r => ({
      ...r,
      receipt_number: r.receipt_number ?? '',
      allocation_mode: 'single' as const,
      payment_items: [],
      total_amount: Number(r.receipt_amount) || 0,
      status: r.status === 'confirmed' ? ('received' as const) : ('pending' as const),
      created_by: r.created_by ?? '',
      updated_at: r.updated_at ?? '',
      created_at: r.created_at ?? '',
    }))

    const profitResult = calculateFullProfit({
      receipts: adaptedReceipts,
      expenses: paymentRequests.map(pr => ({ amount: pr.amount ?? 0 })),
      settings: bonusSettings,
      memberCount,
      employeeDict,
    })

    return {
      tour,
      receipts: receipts.map(r => ({
        receipt_number: r.receipt_number,
        receipt_date: r.receipt_date,
        receipt_amount: Number(r.receipt_amount) || 0,
        amount: Number(r.receipt_amount) || 0,
        payment_method: r.payment_method,
      })),
      costs: paymentRequests,
      profitResult,
      preparedBy: user?.name ?? undefined,
    }
  }, [receipts, paymentRequests, bonusSettings, memberCount, employeeDict, tour, user])

  const handleConfirmCloseFromReport = useCallback(async () => {
    try {
      // 2026-05-15 William 拍板：結案 ≠ 產請款。
      // 拿掉舊邏輯（generateBonusPaymentRequest 自動產獎金請款）、
      // 改寫進 bonus_pending（status=pending）、之後 HR /hr/bonus-settlement 勾選結算。
      const profitResult = reportData.profitResult
      const bonusesToWrite = [
        ...profitResult.employee_bonuses,
        ...profitResult.team_bonuses,
      ].filter(b => b.amount > 0)

      if (bonusesToWrite.length > 0) {
        const res = await apiMutate('/api/hr/bonus-settlements/write-pending', {
          method: 'POST',
          body: {
            tour_id: tour.id,
            tour_code: tour.code || '',
            bonuses: bonusesToWrite.map(b => ({
              employee_id: b.setting.employee_id ?? null,
              employee_name:
                b.employee_name ||
                (b.setting.type === BonusSettingType.TEAM_BONUS ? '團隊獎金' : '獎金'),
              amount: b.amount,
              bonus_kind: BONUS_TYPE_LABELS[b.setting.type] ?? null,
              reason: null,
            })),
          },
          invalidate: ['/api/hr/bonus-settlements/pending-tours'],
        })
        if (!res.ok) {
          throw new Error(res.error || `寫入 bonus_pending 失敗 HTTP ${res.status}`)
        }
      }

      // 鎖定團（標記結案 + 寫 closing_date）
      await updateTour(tour.id, {
        status: TOUR_STATUS.CLOSED,
        closing_date: new Date().toISOString(),
      })

      // invalidate cache
      await Promise.all([
        globalMutate(`tour-${tour.id}`),
        invalidateTourBonusSettings(),
        invalidatePaymentRequests(),
      ])

      const writeMsg =
        bonusesToWrite.length > 0
          ? `、${bonusesToWrite.length} 筆獎金已進入待結算池（人資 → 獎金結算 勾選結算）`
          : ''
      toast.success(`已列印並標記為結案${writeMsg}`)
    } catch (err) {
      logger.error('結案失敗', err)
      toast.error(COMPONENT_LABELS.CLOSE_TOUR_FAILED)
      throw err
    }
  }, [tour.id, tour.code, reportData])

  return (
    <>
      {/* 利潤計算表 + 獎金明細 */}
      <ProfitTab tour={tour} />

      {/* 結案狀況 */}
      <div className="flex items-center justify-between bg-card border border-border rounded-lg px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-morandi-primary">
            {COMPONENT_LABELS.CLOSING_STATUS}
          </span>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusInfo.color}`}
          >
            {statusInfo.label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="soft-gold" onClick={() => setBonusDialogOpen(true)}>
            <Settings className="h-4 w-4 mr-2" />
            {t('closingSectionEditBonus')}
          </Button>
          <Button variant="soft-gold" onClick={() => setReportDialogOpen(true)}>
            <FileDown className="h-4 w-4 mr-2" />
            {isClosed ? '檢視結案報告' : '生成結案報告'}
          </Button>
          {/* 強制重開：只有有 tours.reopen_closed capability 的主管能看到 */}
          {isClosed && canReopenClosed && (
            <Button variant="outline" onClick={handleToggleClosingStatus} disabled={statusUpdating}>
              {statusUpdating ? (
                <Spinner size="md" className="mr-2" />
              ) : (
                <Unlock className="h-4 w-4 mr-2" />
              )}
              {t('closingSectionReopen')}
            </Button>
          )}
        </div>
      </div>

      <BonusSettingsDialog open={bonusDialogOpen} onOpenChange={setBonusDialogOpen} tour={tour} />

      <ClosingReportDialog
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
        data={reportData}
        onConfirmClose={handleConfirmCloseFromReport}
        alreadyClosed={isClosed}
      />

      <ReopenClosedTourDialog
        isOpen={reopenDialogOpen}
        tour={tour}
        onClose={() => setReopenDialogOpen(false)}
        onConfirm={handleConfirmReopen}
        loading={statusUpdating}
      />
    </>
  )
}
