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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { Label } from '@/components/ui/label'
import { CheckSquare, X } from 'lucide-react'
import { apiPost, apiPatch } from '@/lib/api/client'
import { alert } from '@/lib/ui/alert-dialog'
import { logger } from '@/lib/utils/logger'
import { useAuthStore } from '@/stores/auth-store'
import { invalidateDisbursementOrders, invalidatePaymentRequests } from '@/data'
import type { DisbursementOrder, PaymentRequest } from '@/stores/types'
import type { WizardStep } from './disbursement-wizard-types'
import { useWizardData, getInitialDisbursementDate, type PreFilledData } from './useWizardData'
import { OnePageView } from './OnePageView'
import { AddRequestDialog } from '@/app/(main)/finance/requests/_components/AddRequestDialog'
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
  const [pickedItemIds, setPickedItemIds] = useState<string[]>([])
  const [stagedBatches, setStagedBatches] = useState<
    import('./disbursement-wizard-types').StagedBatch[]
  >([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 編輯模式：useWizardData 回填的「本單已 link 品項 + 各自出帳帳戶」（待 unbilledItems 載入後組成 stagedBatches）
  const preloadRef = useRef<{
    linkedItemIds: string[]
    linkedItemBankMap: Record<string, string | null>
  } | null>(null)
  const preloadedRef = useRef(false)

  // ─── reset ───
  const resetAll = useCallback(() => {
    setStep('main')
    setPickedItemIds([])
    setStagedBatches([])
    setDisbursementDate(getInitialDisbursementDate())
    preloadRef.current = null
    preloadedRef.current = false
  }, [])

  const handleClose = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) resetAll()
      onOpenChange(isOpen)
    },
    [onOpenChange, resetAll]
  )

  // ─── 資料載入（拆至 useWizardData）───
  const { bankAccounts, unbilledItems, loading } = useWizardData({
    open,
    workspaceId: user?.workspace_id,
    editingOrder,
    onPreFill: useCallback((preFilledData: PreFilledData) => {
      // 編輯模式：暫存「本單品項 + 各自出帳帳戶」、待 unbilledItems / bankAccounts 載入後組成 stagedBatches
      preloadRef.current = {
        linkedItemIds: preFilledData.linkedItemIds,
        linkedItemBankMap: preFilledData.linkedItemBankMap,
      }
      preloadedRef.current = false
      setDisbursementDate(preFilledData.disbursementDate)
    }, []),
  })

  // 編輯模式：把本單既有品項依 from_bank_account_id 分組、預載成 stagedBatches（與新增頁 chip 行為一致）
  useEffect(() => {
    if (!editingOrder || preloadedRef.current) return
    const preload = preloadRef.current
    if (!preload || bankAccounts.length === 0 || unbilledItems.length === 0) return

    const itemById = new Map(unbilledItems.map(it => [it.id, it]))
    const batchesByBank = new Map<string, import('./disbursement-wizard-types').StagedBatch>()
    for (const itemId of preload.linkedItemIds) {
      const item = itemById.get(itemId)
      const bankId = preload.linkedItemBankMap[itemId]
      if (!item || !bankId) continue
      const bank = bankAccounts.find(b => b.id === bankId)
      let batch = batchesByBank.get(bankId)
      if (!batch) {
        batch = {
          batch_id: crypto.randomUUID(),
          from_bank_account_id: bankId,
          from_bank_label: bank ? bank.name : '未知帳戶',
          from_bank_code: bank?.bank_code ?? null,
          item_ids: [],
          items: [],
          total_fee: 0,
          fee_distribution: 'equal',
        }
        batchesByBank.set(bankId, batch)
      }
      batch.item_ids.push(itemId)
      batch.items.push(item)
    }
    const batches = Array.from(batchesByBank.values())
    setStagedBatches(batches)
    // 2026-05-28 William bug fix：編輯模式預填 stagedBatches 後同步 pickedItemIds
    // （Phase 2「分配後保留勾」設計、checkbox 狀態 = pickedItemIds、跳出再回來時要對齊 stagedBatches）
    setPickedItemIds(batches.flatMap(b => b.item_ids))
    preloadedRef.current = true
  }, [editingOrder, bankAccounts, unbilledItems])

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

  // 點請款單列 → 唯讀檢視（重用 AddRequestDialog readOnly、level=2 巢狀）
  const [viewingRequest, setViewingRequest] = useState<PaymentRequest | null>(null)
  const handleViewRequest = useCallback(
    (requestId: string) => {
      const req = allPaymentRequests.find(r => r.id === requestId)
      if (req) setViewingRequest(req as unknown as PaymentRequest)
    },
    [allPaymentRequests]
  )

  // 已被 staged 的 item ids
  const stagedItemIds = useMemo(() => {
    return new Set(stagedBatches.flatMap(b => b.item_ids))
  }, [stagedBatches])

  // 可選的 items（William 2026-05-28 拍板：分配後不從列表消失、留著顯示為「分配到 X」）
  const availableItems = useMemo(() => unbilledItems, [unbilledItems])

  // 當前勾選的 items 細節
  const pickedItems = useMemo(() => {
    const set = new Set(pickedItemIds)
    return availableItems.filter(it => set.has(it.id))
  }, [availableItems, pickedItemIds])

  // ─── step transitions ───
  const handleSelectBank = useCallback(
    (bankId: string) => {
      if (pickedItemIds.length === 0) {
        void alert('請先勾選要從這個帳戶付款的請款品項', 'warning')
        return
      }
      const bank = bankAccounts.find(b => b.id === bankId)
      if (!bank) return

      // 新增 / 編輯共用同一條路徑（2026-05-27 William 拍板：編輯 = 新增、不再有 edit-only 分支）
      // 吸入勾選 items 進 stagedBatches、清勾選
      // 2026-05-22 William 拍板：購物車合併 — 同帳戶 batch 已存在 → 追加 items、不建新 batch
      const pickedItemsNow = pickedItems
      // 2026-05-27 William 拍板：wizard 不預估、不顯示手續費（同行/跨行在此判斷易誤解）。
      // 真正的手續費於存檔（batch-create）按 SSOT isCrossBankTransfer 計算、列印預覽「跨行手續費」行才顯示。
      // 這裡 total_fee 一律帶 0、不影響存檔結果（per-payer mode 由 batch-create 自行重算）。
      setStagedBatches(prev => {
        const existing = prev.find(b => b.from_bank_account_id === bank.id)
        if (existing) {
          // 合併：追加 items 進原 batch
          // 分配後勾保留、再點同帳戶可能含已 staged 的 itemIds → 用 Map by id 去重
          const itemMap = new Map([...existing.items, ...pickedItemsNow].map(it => [it.id, it]))
          const mergedItems = Array.from(itemMap.values())
          const mergedItemIds = mergedItems.map(it => it.id)
          return prev.map(b =>
            b.batch_id === existing.batch_id
              ? { ...b, items: mergedItems, item_ids: mergedItemIds }
              : b
          )
        }
        const batch: import('./disbursement-wizard-types').StagedBatch = {
          batch_id: crypto.randomUUID(),
          from_bank_account_id: bank.id,
          from_bank_label: bank.name,
          from_bank_code: bank.bank_code,
          item_ids: [...pickedItemIds],
          items: [...pickedItemsNow],
          total_fee: 0,
          fee_distribution: 'equal',
        }
        return [...prev, batch]
      })
      // 2026-05-28 William 拍板：分配後保留勾選、不清空（item 留列表、checkbox 仍勾）
    },
    [bankAccounts, pickedItemIds, pickedItems]
  )

  const handleRemoveStaged = useCallback((batchId: string) => {
    setStagedBatches(prev => prev.filter(b => b.batch_id !== batchId))
  }, [])

  // 2026-05-28 William 拍板：取消勾單筆 → 自動從 batch 退出（不用整批解除）
  // batch 退空 → 整批移除
  const handleChangePicked = useCallback(
    (newPickedIds: string[]) => {
      const newSet = new Set(newPickedIds)
      const removedIds = pickedItemIds.filter(id => !newSet.has(id))
      if (removedIds.length > 0) {
        setStagedBatches(prev =>
          prev
            .map(b => ({
              ...b,
              item_ids: b.item_ids.filter(id => !removedIds.includes(id)),
              items: b.items.filter(it => !removedIds.includes(it.id)),
            }))
            .filter(b => b.item_ids.length > 0)
        )
      }
      setPickedItemIds(newPickedIds)
    },
    [pickedItemIds]
  )

  // ─── submit ───
  const handleSubmit = useCallback(async () => {
    if (!disbursementDate) {
      void alert('請選擇出帳日期', 'warning')
      return
    }

    if (stagedBatches.length === 0) {
      void alert('請至少勾選品項並點帳戶按鈕完成分配', 'warning')
      return
    }

    // 編輯模式：PATCH（batches 與新增同結構；手續費由後端按 SSOT 自動算、前端不帶 fee）
    if (editingOrder) {
      setIsSubmitting(true)
      try {
        await apiPatch(`/api/disbursement/${editingOrder.id}`, {
          disbursement_date: disbursementDate,
          batches: stagedBatches.map(b => ({
            from_bank_account_id: b.from_bank_account_id,
            payment_request_item_ids: b.item_ids,
          })),
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
    // total_fee 帶 0：手續費於 batch-create 按 SSOT per-payer 自動重算（與編輯一致）
    const derivedBatches = stagedBatches.map(b => ({
      from_bank_account_id: b.from_bank_account_id,
      disbursement_date: disbursementDate,
      payment_request_item_ids: b.item_ids,
      total_fee: b.total_fee,
      fee_distribution: b.fee_distribution,
    }))

    setIsSubmitting(true)
    try {
      const res = await apiPost<{
        batch_uuid: string
        created: { order_number: string; bank_group_count: number; item_count: number }[]
      }>('/api/disbursement/batch-create', { batches: derivedBatches })
      await Promise.all([invalidateDisbursementOrders(), invalidatePaymentRequests()])
      const created = res.created[0]
      await alert(
        `已建立出納單 ${created?.order_number ?? ''}（${created?.bank_group_count ?? derivedBatches.length} 個銀行帳戶、共 ${created?.item_count ?? 0} 筆品項）`,
        'success'
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
  }, [editingOrder, disbursementDate, stagedBatches, resetAll, onSuccess])

  // ─── 顯示 ───
  const stepLabels: Record<WizardStep, string> = {
    main: '',
    'fill-fee': '填寫該批手續費',
    'preview-all': '預覽 & 確認儲存',
  }

  // open=true 時派 event、TourProvider 監聽 → 觸發 create-disbursement 教學
  // 只在「真的新增」跑、編輯模式（有 editingOrder）不跑
  // open=false 時派 close event、強制收回 tour、避免 NextStepjs state 殘留
  useEffect(() => {
    if (open && !editingOrder) {
      window.dispatchEvent(new CustomEvent('venturo:create-disbursement-opened'))
    } else if (!open) {
      window.dispatchEvent(
        new CustomEvent('venturo:dialog-closed', { detail: { tour: 'create-disbursement' } })
      )
    }
  }, [open, editingOrder])

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        level={1}
        size="full"
        data-tutorial="create-disbursement-dialog"
        className="!max-w-[98vw] h-[94vh] overflow-hidden flex flex-col"
      >
        <DialogHeader className="flex-shrink-0" data-tutorial="create-disbursement-header">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <DialogTitle className="text-xl flex items-center gap-3">
              {editingOrder
                ? `編輯出納單 ${editingOrder.order_number || editingOrder.code || ''}`
                : '新增出納單(品項級)'}
              {!editingOrder && (
                <span className="text-sm font-normal text-morandi-gold">{stepLabels[step]}</span>
              )}
              {stagedBatches.length > 0 && (
                <span className="text-sm font-normal text-morandi-secondary">
                  已加入 {stagedBatches.length} 批
                </span>
              )}
            </DialogTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Label htmlFor="disb-date" className="text-sm">
                出帳日期
              </Label>
              <DatePicker
                value={disbursementDate}
                onChange={setDisbursementDate}
                className="w-40"
              />
              {/* 新增 / 編輯共用 one-page：帳戶按鈕（吸入勾選 items）+ 取消 / 儲存。
                  2026-05-27 William 拍板：編輯 = 新增、不再有 edit-only 手續費 UI、手續費後端自動算。 */}
              {step === 'main' && (
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
                    <X size={14} className="mr-1" />
                    取消
                  </Button>
                  <Button
                    variant="morandi-gold"
                    size="sm"
                    onClick={handleSubmit}
                    disabled={isSubmitting || stagedBatches.length === 0}
                  >
                    <CheckSquare size={14} className="mr-1" />
                    {isSubmitting ? '儲存中...' : editingOrder ? '儲存變更' : '儲存出納單'}
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
              onChangePicked={handleChangePicked}
              onRemoveStaged={handleRemoveStaged}
              onViewRequest={handleViewRequest}
            />
          )}
        </div>

        {/* 點請款單列 → 唯讀檢視彈窗（重用 AddRequestDialog、level=2 巢狀於本 level=1 dialog）*/}
        <AddRequestDialog
          open={!!viewingRequest}
          onOpenChange={open => {
            if (!open) setViewingRequest(null)
          }}
          editingRequest={viewingRequest}
          readOnly
          level={2}
        />

        {/* 按鈕都在 DialogHeader、不需要 footer */}
      </DialogContent>
    </Dialog>
  )
}
