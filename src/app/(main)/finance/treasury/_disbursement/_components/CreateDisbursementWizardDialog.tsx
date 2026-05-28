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
          // 2026-05-28 William 拍板：帳戶名統一不帶括號（無 bank_name 後綴）
          from_bank_label: bank ? bank.name : '(未知帳戶)',
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
    // 編輯模式：把已 link 品項預先填入勾選（讓 checkbox 顯示為已選、可取消勾退出 batch）
    const preloadedIds = preload.linkedItemIds.filter(id => itemById.has(id))
    setStagedBatches(Array.from(batchesByBank.values()))
    setPickedItemIds(preloadedIds)
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

  // 2026-05-28 William 拍板：列表不再隱藏已分配 item、永遠列出全部 unbilledItems。
  // 已分配的行用行內 chip + 輕背景表示「已分到 X 銀行」、取消勾選 → 從 batch 退出（見下方 handleChangePicked）
  const availableItems = unbilledItems

  // 每個 item 屬於哪個 batch（itemId → from_bank_label）— 給列表行內 chip 用
  const itemBankLabelMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const b of stagedBatches) {
      for (const id of b.item_ids) {
        map.set(id, b.from_bank_label)
      }
    }
    return map
  }, [stagedBatches])

  // 當前勾選的 items 細節（從全部 unbilledItems 取、排除已 staged 的、避免重複加入 batch）
  const pickedItems = useMemo(() => {
    const set = new Set(pickedItemIds)
    return unbilledItems.filter(it => set.has(it.id) && !stagedItemIds.has(it.id))
  }, [unbilledItems, pickedItemIds, stagedItemIds])

  // ─── step transitions ───
  const handleSelectBank = useCallback(
    (bankId: string) => {
      // 只吸入「尚未分配」的勾選 items（已分配的不重複塞）
      const newPickedItems = pickedItems
      if (newPickedItems.length === 0) {
        void alert('請先勾選尚未分配的請款品項', 'warning')
        return
      }
      const bank = bankAccounts.find(b => b.id === bankId)
      if (!bank) return

      // 新增 / 編輯共用同一條路徑（2026-05-27 William 拍板：編輯 = 新增、不再有 edit-only 分支）
      // 2026-05-22 William 拍板：購物車合併 — 同帳戶 batch 已存在 → 追加 items、不建新 batch
      // 2026-05-28 William 拍板：分配後保留勾選狀態（讓用戶可隨時取消勾 = 退出 batch）
      const newItemIds = newPickedItems.map(it => it.id)
      setStagedBatches(prev => {
        const existing = prev.find(b => b.from_bank_account_id === bank.id)
        if (existing) {
          // 合併：追加 items 進原 batch
          return prev.map(b =>
            b.batch_id === existing.batch_id
              ? {
                  ...b,
                  items: [...existing.items, ...newPickedItems],
                  item_ids: [...existing.item_ids, ...newItemIds],
                }
              : b
          )
        }
        const batch: import('./disbursement-wizard-types').StagedBatch = {
          batch_id: crypto.randomUUID(),
          from_bank_account_id: bank.id,
          // 2026-05-28 William 拍板：帳戶名統一不帶括號（無 bank_name 後綴）
          from_bank_label: bank.name,
          from_bank_code: bank.bank_code,
          item_ids: [...newItemIds],
          items: [...newPickedItems],
          total_fee: 0,
          fee_distribution: 'equal',
        }
        return [...prev, batch]
      })
      // 分配後不清空 pickedItemIds、保留勾選狀態（取消勾 → 退出 batch）
    },
    [bankAccounts, pickedItems]
  )

  // 2026-05-28 William 拍板：取消勾選 = 自動從 batch 退出
  // checkbox 變動由此 wrapper 處理；若某 item 已在 staged 但被取消勾、同步從 batch 移除；batch 空 → 整批移除
  const handleChangePicked = useCallback(
    (nextIds: string[]) => {
      const nextSet = new Set(nextIds)
      // 找出「原本 staged 但這次被取消勾」的 ids
      const removedFromStaged: string[] = []
      for (const sid of stagedItemIds) {
        if (!nextSet.has(sid)) removedFromStaged.push(sid)
      }
      if (removedFromStaged.length > 0) {
        const removedSet = new Set(removedFromStaged)
        setStagedBatches(prev =>
          prev
            .map(b => ({
              ...b,
              item_ids: b.item_ids.filter(id => !removedSet.has(id)),
              items: b.items.filter(it => !removedSet.has(it.id)),
            }))
            .filter(b => b.item_ids.length > 0)
        )
      }
      setPickedItemIds(nextIds)
    },
    [stagedItemIds]
  )

  const handleRemoveStaged = useCallback(
    (batchId: string) => {
      // 同步把該 batch 內的 items 從 pickedItemIds 移除（保持 checkbox 狀態跟 staged 一致）
      const batch = stagedBatches.find(b => b.batch_id === batchId)
      if (batch) {
        const removeSet = new Set(batch.item_ids)
        setPickedItemIds(prev => prev.filter(id => !removeSet.has(id)))
      }
      setStagedBatches(prev => prev.filter(b => b.batch_id !== batchId))
    },
    [stagedBatches]
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

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        level={1}
        size="full"
        className="!max-w-[98vw] h-[94vh] overflow-hidden flex flex-col"
      >
        <DialogHeader className="flex-shrink-0">
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
                      title={bank.name}
                      disabled={pickedItems.length === 0}
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
                    variant="header-outline"
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
              bankAccounts={bankAccounts}
              itemBankLabelMap={itemBankLabelMap}
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
