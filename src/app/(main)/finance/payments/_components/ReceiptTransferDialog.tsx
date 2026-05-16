'use client'

import { useState, useMemo } from 'react'
import { FormDialog } from '@/components/dialog'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import { ArrowRightLeft, X} from 'lucide-react'
import { useToursSlim, invalidateReceipts } from '@/data'
import { useTourOptions } from '@/hooks'
import { supabase } from '@/lib/supabase/client'
import { generateReceiptNo } from '@/lib/codes'
import { useAuthStore } from '@/stores'
import { logger } from '@/lib/utils/logger'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils/format-currency'

import { Spinner } from '@/components/ui/spinner'
const COMPONENT_LABELS = {
  RECEIPT_NUMBER: '收款單號',
  TRANSFER_AMOUNT: '轉移金額',
  PH_SEARCH_TOUR: '搜尋團號或團名...',
  TITLE: '收款轉移',
  FROM: '從',
  TRANSFER_TO_OTHER_TOUR: '轉移至其他團',
  TARGET_TOUR: '目標團',
  TOUR_NOT_FOUND: '找不到團',
  CANCEL: '取消',
  CONFIRM_TRANSFER: '確認轉移',
} as const

interface ReceiptTransferDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 來源收款資訊（已 confirmed 的、要轉到別團） */
  sourceReceipt: {
    id: string
    receipt_number: string
    tour_id: string | null
    order_id?: string | null
    tour_code: string
    tour_name: string
    receipt_amount: number
    actual_amount?: number | null
    fees?: number | null
    payment_method_id: string | null
    payment_method: string
    receipt_type: number
  } | null
  onSuccess?: () => void
}

/**
 * 收款轉移 Dialog（跟 CostTransferDialog 鏡像、視覺一致）
 *
 * 邏輯：不改既有 receipt、改成建兩張新 receipt：
 *   src: tour=來源團、amount=-X、status=pending、pair_id=X
 *   dst: tour=目標團、amount=+X、status=pending、pair_id=X
 * 兩張共用 transferred_pair_id、走 pending → confirmed flow
 */
export function ReceiptTransferDialog({
  open,
  onOpenChange,
  sourceReceipt,
  onSuccess,
}: ReceiptTransferDialogProps) {
  const { items: tours } = useToursSlim({ all: true })
  const { user } = useAuthStore()
  const [targetTourId, setTargetTourId] = useState('')
  const [transferring, setTransferring] = useState(false)

  // 排除來源團（不能轉給自己）
  const filteredTours = useMemo(
    () => tours.filter(t => t.id !== sourceReceipt?.tour_id),
    [tours, sourceReceipt?.tour_id]
  )
  const tourOptions = useTourOptions(filteredTours)

  const handleTransfer = async () => {
    if (!sourceReceipt || !targetTourId) return
    if (!user?.workspace_id) {
      toast.error('轉移失敗', { description: '找不到 workspace' })
      return
    }

    const targetTour = tours.find(t => t.id === targetTourId) as
      | { id: string; code?: string | null; name?: string | null }
      | undefined
    if (!targetTour) return

    setTransferring(true)
    try {
      const pairId = crypto.randomUUID()
      const today = new Date().toISOString().split('T')[0]
      const amount = sourceReceipt.receipt_amount

      // 1. 產生兩張 receipt 編號 — 透過中央 codes module（RPC + advisory lock）
      const srcReceiptNo = await generateReceiptNo(sourceReceipt.tour_id || '')
      const dstReceiptNo = await generateReceiptNo(targetTour.id)

      // 2. 建 src receipt（來源團、負金額）
      // fees 也帶過去（負）、避免刷卡收款轉團後手續費歸零、淨額算錯
      const srcFees = sourceReceipt.fees ? -Number(sourceReceipt.fees) : 0
      const srcPayload = {
        receipt_number: srcReceiptNo,
        workspace_id: user.workspace_id,
        tour_id: sourceReceipt.tour_id,
        tour_name: sourceReceipt.tour_name,
        receipt_date: today,
        payment_date: today,
        payment_method: sourceReceipt.payment_method,
        payment_method_id: sourceReceipt.payment_method_id,
        receipt_type: sourceReceipt.receipt_type,
        receipt_amount: -amount,
        actual_amount: 0,
        fees: srcFees,
        status: 'pending',
        transferred_pair_id: pairId,
        notes: `收款轉移至 ${targetTour.code || ''}`,
        created_by: user.id,
        updated_by: user.id,
        is_active: true,
      }
      const { data: srcReceipt, error: srcErr } = await supabase
        .from('receipts')
        .insert(srcPayload as never)
        .select('id, transferred_pair_id')
        .single()
      if (srcErr || !srcReceipt) throw srcErr || new Error('建來源端收款單失敗')

      // 防守：DB 沒寫進 transferred_pair_id（schema 變動 / RLS 等）→ 立即 rollback
      if (!(srcReceipt as { transferred_pair_id?: string | null }).transferred_pair_id) {
        await supabase
          .from('receipts')
          .delete()
          .eq('id', (srcReceipt as { id: string }).id)
        throw new Error('來源端收款單 transferred_pair_id 寫入失敗、轉移已取消')
      }

      // 3. 建 dst receipt（目標團、正金額）
      const dstFees = sourceReceipt.fees ? Number(sourceReceipt.fees) : 0
      const dstPayload = {
        receipt_number: dstReceiptNo,
        workspace_id: user.workspace_id,
        tour_id: targetTour.id,
        tour_name: targetTour.name || '',
        receipt_date: today,
        payment_date: today,
        payment_method: sourceReceipt.payment_method,
        payment_method_id: sourceReceipt.payment_method_id,
        receipt_type: sourceReceipt.receipt_type,
        receipt_amount: amount,
        actual_amount: 0,
        fees: dstFees,
        status: 'pending',
        transferred_pair_id: pairId,
        notes: `從 ${sourceReceipt.tour_code} 轉入`,
        created_by: user.id,
        updated_by: user.id,
        is_active: true,
      }
      const { data: dstReceipt, error: dstErr } = await supabase
        .from('receipts')
        .insert(dstPayload as never)
        .select('id, transferred_pair_id')
        .single()
      if (dstErr || !dstReceipt) {
        // rollback src
        await supabase
          .from('receipts')
          .delete()
          .eq('id', (srcReceipt as { id: string }).id)
        throw dstErr || new Error('建目標端收款單失敗')
      }

      // 防守：dst 沒寫進 pair_id → rollback 兩邊
      if (!(dstReceipt as { transferred_pair_id?: string | null }).transferred_pair_id) {
        await supabase
          .from('receipts')
          .delete()
          .in('id', [
            (srcReceipt as { id: string }).id,
            (dstReceipt as { id: string }).id,
          ])
        throw new Error('目標端收款單 transferred_pair_id 寫入失敗、轉移已取消')
      }

      // 4. 重算來源 / 目標團的收款統計（pending 狀態 actual_amount=0、不影響數字、
      //    但 invalidate cache 讓 UI 立即抓到新建的兩張）
      try {
        const { recalculateReceiptStats } = await import(
          '@/app/(main)/finance/payments/_services/receipt-core.service'
        )
        await Promise.all([
          recalculateReceiptStats(sourceReceipt.order_id ?? null, sourceReceipt.tour_id),
          recalculateReceiptStats(null, targetTour.id),
        ])
      } catch (recalcErr) {
        logger.error('轉移後重算統計失敗（不阻擋成功訊息）:', recalcErr)
      }

      // 5. 成功
      await invalidateReceipts()
      toast.success('收款轉移成功', {
        description: `已建立 2 張對沖收款單：${sourceReceipt.tour_code} -${formatCurrency(
          amount
        )} / ${targetTour.code} +${formatCurrency(amount)}`,
      })

      setTargetTourId('')
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      logger.error('收款轉移失敗:', error)
      toast.error('轉移失敗', {
        description: (error as Error)?.message || '請稍後再試',
      })
    } finally {
      setTransferring(false)
    }
  }

  if (!sourceReceipt) return null

  const customFooter = (
    <div className="flex items-center justify-end gap-2">
      <Button variant="soft-gold" onClick={() => onOpenChange(false)}>
        <X className="h-4 w-4" />
        {COMPONENT_LABELS.CANCEL}
      </Button>
      <Button
        variant="soft-gold"
        onClick={handleTransfer}
        disabled={transferring || !targetTourId}
        className="gap-2"
      >
        {transferring ? (
          <Spinner size="sm" />
        ) : (
          <ArrowRightLeft size={14} />
        )}
        {COMPONENT_LABELS.CONFIRM_TRANSFER}
      </Button>
    </div>
  )

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={
        <span className="flex items-center gap-2">
          <ArrowRightLeft size={18} />
          {COMPONENT_LABELS.TITLE}
        </span>
      }
      onSubmit={handleTransfer}
      submitDisabled={transferring || !targetTourId}
      loading={transferring}
      footer={customFooter}
      level={3}
      maxWidth="lg"
    >
      {/* 來源資訊 */}
      <div className="text-sm text-morandi-secondary mb-2">
        {COMPONENT_LABELS.FROM} <span className="font-medium text-morandi-primary">{sourceReceipt.tour_code}</span>{' '}
        {sourceReceipt.tour_name} {COMPONENT_LABELS.TRANSFER_TO_OTHER_TOUR}
      </div>

      {/* 來源金額 */}
      <div className="mb-4 p-3 bg-morandi-container/30 rounded-lg">
        <div className="flex items-center justify-between">
          <span className="text-sm text-morandi-secondary">{COMPONENT_LABELS.RECEIPT_NUMBER}</span>
          <span className="text-sm font-medium text-morandi-primary">
            {sourceReceipt.receipt_number}
          </span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-sm text-morandi-secondary">{COMPONENT_LABELS.TRANSFER_AMOUNT}</span>
          <span className="text-base font-semibold text-morandi-gold">
            {formatCurrency(sourceReceipt.receipt_amount)}
          </span>
        </div>
      </div>

      {/* 選擇目標團 */}
      <div className="mb-4">
        <label className="text-sm font-medium text-morandi-primary mb-1 block">
          {COMPONENT_LABELS.TARGET_TOUR} <span className="text-morandi-red">*</span>
        </label>
        <Combobox
          options={tourOptions}
          value={targetTourId}
          onChange={setTargetTourId}
          placeholder={COMPONENT_LABELS.PH_SEARCH_TOUR}
          emptyMessage={COMPONENT_LABELS.TOUR_NOT_FOUND}
          className="w-full"
          maxHeight="200px"
        />
      </div>
    </FormDialog>
  )
}
