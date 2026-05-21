'use client'
/**
 * CreateDisbursementWizardDialog
 * 2026-05-15 buttons moved to header row (cache bust v2)
 *
 * Phase 3 多步驟 wizard：新增出納單品項級。
 *
 * Step 流程：
 *   select-bank → pick-items → fill-fee → (循環 or) preview-all → 儲存
 *
 * 設計：spec 卡 2026-05-14-出納單品項級重構-spec.md + Phase3 handoff
 *
 * 只用於「新建」、編輯舊出納單仍走 CreateDisbursementDialog（舊請款單級 link）。
 */

import { useCallback, useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Check, X } from 'lucide-react'
import { apiPost, apiPatch } from '@/lib/api/client'
import { alert } from '@/lib/ui/alert-dialog'
import { logger } from '@/lib/utils/logger'
import { useAuthStore } from '@/stores/auth-store'
import { invalidateDisbursementOrders, invalidatePaymentRequests } from '@/data'
import type { DisbursementOrder } from '@/stores/types'
import type { WizardStep, BankAccountOption } from './disbursement-wizard-types'
import { useWizardData, getInitialDisbursementDate, type PreFilledData } from './useWizardData'
import { OnePageView } from './OnePageView'
import { useReceipts } from '@/data/entities/receipts'
import { usePaymentRequests } from '@/data/entities/payment-requests'

interface CreateDisbursementWizardDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  /**
   * 2026-05-15 William 拍板新增 / 編輯共用：
   *   - null / undefined → 新增模式（既有 multi-batch 流程）
   *   - DisbursementOrder → 編輯模式（single-batch、預勾已 link items、PATCH submit）
   */
  editingOrder?: DisbursementOrder | null
}

export function CreateDisbursementWizardDialog({
  open,
  onOpenChange,
  onSuccess,
  editingOrder = null,
}: CreateDisbursementWizardDialogProps) {
  const user = useAuthStore(state => state.user)

  const [disbursementDate, setDisbursementDate] = useState(getInitialDisbursementDate())

  const [step, setStep] = useState<WizardStep>('main')
  const [currentBank, setCurrentBank] = useState<BankAccountOption | null>(null)
  const [pickedItemIds, setPickedItemIds] = useState<string[]>([])
  const [currentFee, setCurrentFee] = useState(0)
  const [feeDistribution, setFeeDistribution] = useState<'equal' | 'proportional'>('proportional')
  const [stagedBatches, setStagedBatches] = useState<import('./disbursement-wizard-types').StagedBatch[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  // ─── reset ───
  const resetAll = useCallback(() => {
    setStep('main')
    setCurrentBank(null)
    setPickedItemIds([])
    setCurrentFee(0)
    setFeeDistribution('proportional')
    setStagedBatches([])
    setDisbursementDate(getInitialDisbursementDate())
  }, [])

  const handleClose = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) resetAll()
      onOpenChange(isOpen)
    },
    [onOpenChange, resetAll],
  )

  // ─── 資料載入（拆至 useWizardData）───
  const { bankAccounts, unbilledItems, loading } = useWizardData({
    open,
    workspaceId: user?.workspace_id,
    editingOrder,
    onPreFill: useCallback((preFilledData: PreFilledData) => {
      setPickedItemIds(preFilledData.pickedItemIds)
      if (preFilledData.currentBank) setCurrentBank(preFilledData.currentBank)
      setCurrentFee(preFilledData.currentFee)
      setFeeDistribution(preFilledData.feeDistribution)
      setDisbursementDate(preFilledData.disbursementDate)
    }, []),
  })

  // 每團已收款 map（status='confirmed' 才算實際入帳）— 給 wizard 列表「超支警示」用
  const { items: receipts } = useReceipts({ all: true })
  const incomeByTourId = useMemo(() => {
    const map = new Map<string, number>()
    for (const r of receipts) {
      if (!r.tour_id || r.status !== 'confirmed') continue
      const amt = Number(r.actual_amount ?? r.receipt_amount ?? 0)
      map.set(r.tour_id, (map.get(r.tour_id) ?? 0) + amt)
    }
    return map
  }, [receipts])

  // 每團累計已付支出 map（payment_requests.status='paid'）
  // 警示邏輯：累計已付 + 本次勾選 > 已收 才算超支
  const { items: allPaymentRequests } = usePaymentRequests({ all: true })
  const alreadyPaidByTourId = useMemo(() => {
    const map = new Map<string, number>()
    for (const pr of allPaymentRequests) {
      if (!pr.tour_id || pr.status !== 'paid') continue
      const amt = Number(pr.amount ?? 0)
      map.set(pr.tour_id, (map.get(pr.tour_id) ?? 0) + amt)
    }
    return map
  }, [allPaymentRequests])

  // 已被 staged 的 item ids
  const stagedItemIds = useMemo(() => {
    return new Set(stagedBatches.flatMap(b => b.item_ids))
  }, [stagedBatches])

  // 可選的 items（排除已 staged）
  const availableItems = useMemo(() => {
    return unbilledItems.filter(it => !stagedItemIds.has(it.id))
  }, [unbilledItems, stagedItemIds])

  // 當前勾選的 items 細節
  const pickedItems = useMemo(() => {
    const set = new Set(pickedItemIds)
    return availableItems.filter(it => set.has(it.id))
  }, [availableItems, pickedItemIds])

  // ─── step transitions ───
  const handleSelectBank = useCallback((bankId: string) => {
    if (pickedItemIds.length === 0) {
      void alert('請先勾選要從這個帳戶付款的請款品項', 'warning')
      return
    }
    const bank = bankAccounts.find(b => b.id === bankId)
    if (!bank) return

    if (editingOrder) {
      setCurrentBank(bank)
      return
    }

    // 新增模式：吸入勾選 items 進 stagedBatches、清勾選
    const pickedItemsNow = pickedItems
    // 2026-05-21 William 拍板：自動算預估手續費 = unique payer 數 × bank.cross_bank_fee
    // payer_key 推導順序：advanced_by > payee_employee_id > supplier_id > item.id（同 backend）
    const crossBankFee = Number(bank.cross_bank_fee || 0)
    let estimatedFee = 0
    if (crossBankFee > 0) {
      const uniquePayers = new Set<string>()
      for (const it of pickedItemsNow) {
        const key =
          it.advanced_by
            ? `e:${it.advanced_by}`
            : it.payee_employee_id
              ? `e:${it.payee_employee_id}`
              : it.supplier_id
                ? `s:${it.supplier_id}`
                : `i:${it.id}`
        uniquePayers.add(key)
      }
      estimatedFee = uniquePayers.size * crossBankFee
    }
    const batch: import('./disbursement-wizard-types').StagedBatch = {
      batch_id: crypto.randomUUID(),
      from_bank_account_id: bank.id,
      from_bank_label: bank.name + (bank.bank_name ? `(${bank.bank_name})` : ''),
      from_bank_code: bank.bank_code,
      item_ids: [...pickedItemIds],
      items: [...pickedItemsNow],
      total_fee: estimatedFee, // 系統預估、user 可在 staged list 改
      fee_distribution: 'equal',
    }
    setStagedBatches(prev => [...prev, batch])
    setPickedItemIds([])
  }, [bankAccounts, pickedItemIds, pickedItems, editingOrder])

  const handleUpdateStagedFee = useCallback((batchId: string, fee: number) => {
    setStagedBatches(prev =>
      prev.map(b => (b.batch_id === batchId ? { ...b, total_fee: fee } : b)),
    )
  }, [])

  const handleRemoveStaged = useCallback((batchId: string) => {
    setStagedBatches(prev => prev.filter(b => b.batch_id !== batchId))
  }, [])

  // ─── submit ───
  const handleSubmit = useCallback(async () => {
    if (!disbursementDate) {
      void alert('請選擇出帳日期', 'warning')
      return
    }

    // 編輯模式：PATCH 單張
    if (editingOrder) {
      if (!currentBank) {
        void alert('請選出帳帳戶', 'warning')
        return
      }
      if (pickedItemIds.length === 0) {
        void alert('至少要選一筆品項', 'warning')
        return
      }
      if (currentFee < 0) {
        void alert('手續費不能為負', 'warning')
        return
      }
      setIsSubmitting(true)
      try {
        await apiPatch(`/api/disbursement/${editingOrder.id}`, {
          disbursement_date: disbursementDate,
          from_bank_account_id: currentBank.id,
          total_fee: currentFee,
          fee_distribution: feeDistribution,
          item_ids: pickedItemIds,
        })
        await Promise.all([invalidateDisbursementOrders(), invalidatePaymentRequests()])
        await alert('出納單已更新', 'success')
        onSuccess()
      } catch (err) {
        logger.error('更新出納單失敗', err)
        const msg = err instanceof Error ? err.message : '更新失敗'
        await alert(msg, 'error')
      } finally {
        setIsSubmitting(false)
      }
      return
    }

    // 新增模式：從 stagedBatches 派生 batches（Phase 7：多 bank group → 單張 DO）
    const derivedBatches = stagedBatches.map(b => ({
      from_bank_account_id: b.from_bank_account_id,
      disbursement_date: disbursementDate,
      payment_request_item_ids: b.item_ids,
      total_fee: b.total_fee,
      fee_distribution: b.fee_distribution,
    }))

    if (derivedBatches.length === 0) {
      void alert('請至少勾選品項並點帳戶按鈕完成分配', 'warning')
      return
    }
    setIsSubmitting(true)
    try {
      const res = await apiPost<{ batch_uuid: string; created: { order_number: string; bank_group_count: number; item_count: number }[] }>(
        '/api/disbursement/batch-create',
        { batches: derivedBatches },
      )
      await Promise.all([invalidateDisbursementOrders(), invalidatePaymentRequests()])
      const created = res.created[0]
      await alert(
        `已建立出納單 ${created?.order_number ?? ''}（${created?.bank_group_count ?? derivedBatches.length} 個銀行帳戶、共 ${created?.item_count ?? 0} 筆品項）`,
        'success',
      )
      resetAll()
      onSuccess()
    } catch (err) {
      logger.error('建立出納單失敗', err)
      const msg = err instanceof Error ? err.message : '建立失敗'
      await alert(msg, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }, [
    editingOrder, disbursementDate,
    currentBank, pickedItemIds, currentFee, feeDistribution,
    stagedBatches,
    resetAll, onSuccess,
  ])

  // ─── 顯示 ───
  const stepLabels: Record<WizardStep, string> = {
    'main': '',
    'fill-fee': '填寫該批手續費',
    'preview-all': '預覽 & 確認儲存',
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent level={1} size="full" className="!max-w-[98vw] h-[94vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <DialogTitle className="text-xl flex items-center gap-3">
              {editingOrder
                ? `編輯出納單 ${editingOrder.order_number || editingOrder.code || ''}`
                : '新增出納單(品項級)'}
              {!editingOrder && (
                <span className="text-sm font-normal text-morandi-gold">
                  {stepLabels[step]}
                </span>
              )}
              {!editingOrder && stagedBatches.length > 0 && (
                <span className="text-sm font-normal text-morandi-secondary">
                  已加入 {stagedBatches.length} 批
                </span>
              )}
            </DialogTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Label htmlFor="disb-date" className="text-sm">出帳日期</Label>
              <DatePicker value={disbursementDate} onChange={setDisbursementDate} className="w-40" />
              {/* 編輯模式：帳戶按鈕（active 高亮）+ 手續費 input + 分攤 + 取消 / 儲存變更 */}
              {editingOrder && (
                <>
                  <div className="w-px h-6 bg-morandi-border mx-2" />
                  {bankAccounts.map(bank => {
                    const isActive = bank.id === currentBank?.id
                    return (
                      <Button
                        key={bank.id}
                        variant={isActive ? 'default' : 'soft-gold'}
                        size="sm"
                        onClick={() => handleSelectBank(bank.id)}
                        title={`${bank.name}${bank.bank_name ? `(${bank.bank_name})` : ''}`}
                      >
                        {bank.name}
                      </Button>
                    )
                  })}
                  <Input
                    type="number"
                    value={currentFee}
                    onChange={e => setCurrentFee(Number(e.target.value) || 0)}
                    placeholder="手續費"
                    className="w-24"
                  />
                  <Select
                    value={feeDistribution}
                    onValueChange={v => setFeeDistribution(v as 'equal' | 'proportional')}
                  >
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="proportional">按金額比例</SelectItem>
                      <SelectItem value="equal">平均分攤</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="soft-gold" size="sm" onClick={() => handleClose(false)}>
                    <X size={14} className="mr-1" />取消
                  </Button>
                  <Button
                    variant="soft-gold"
                    size="sm"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                  >
                    <Check size={14} className="mr-1" />
                    {isSubmitting ? '儲存中...' : '儲存變更'}
                  </Button>
                </>
              )}

              {/* 新增模式 one-page：帳戶按鈕（吸入勾選 items）+ 取消 / 儲存 */}
              {!editingOrder && step === 'main' && (
                <>
                  <div className="w-px h-6 bg-morandi-border mx-2" />
                  {bankAccounts.map(bank => (
                    <Button
                      key={bank.id}
                      variant="soft-gold"
                      size="sm"
                      onClick={() => handleSelectBank(bank.id)}
                      title={`${bank.name}${bank.bank_name ? `(${bank.bank_name})` : ''}`}
                      disabled={pickedItemIds.length === 0}
                    >
                      {bank.name}
                    </Button>
                  ))}
                  <div className="w-px h-6 bg-morandi-border mx-2" />
                  <Button variant="soft-gold" size="sm" onClick={() => handleClose(false)}>
                    <X size={14} className="mr-1" />取消
                  </Button>
                  <Button
                    variant="soft-gold"
                    size="sm"
                    onClick={handleSubmit}
                    disabled={isSubmitting || stagedBatches.length === 0}
                  >
                    <Check size={14} className="mr-1" />
                    {isSubmitting ? '儲存中...' : '儲存出納單'}
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 flex flex-col">
          {loading && (
            <div className="flex-1 flex items-center justify-center text-morandi-secondary">
              載入中...
            </div>
          )}

          {!loading && step === 'main' && (
            <OnePageView
              availableItems={availableItems}
              stagedBatches={stagedBatches}
              pickedItemIds={pickedItemIds}
              incomeByTourId={incomeByTourId}
              alreadyPaidByTourId={alreadyPaidByTourId}
              onChangePicked={setPickedItemIds}
              onRemoveStaged={handleRemoveStaged}
              onUpdateStagedFee={editingOrder ? undefined : handleUpdateStagedFee}
            />
          )}
        </div>

        {/* 按鈕都在 DialogHeader、不需要 footer */}
      </DialogContent>
    </Dialog>
  )
}
