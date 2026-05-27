'use client'
/**
 * Add Receipt Dialog (Table-based Input)
 * 新增收款單對話框（表格式輸入，參考請款管理風格）
 */

import { logger } from '@/lib/utils/logger'
import { getTodayString } from '@/lib/utils/format-date'
import { useEffect, useState } from 'react'
import { ReceiptTransferDialog } from './ReceiptTransferDialog'
import { BatchReceiptDialog } from './BatchReceiptDialog'
import { Dialog, DialogContent, type DialogLevel } from '@/components/ui/dialog'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { usePaymentForm } from '../_hooks/usePaymentForm'
import { useReceiptMutations } from '../_hooks/useReceiptMutations'
import { recalculateReceiptStats } from '../_services/receipt-core.service'
import { type InlineEditColumn } from '@/components/ui/inline-edit-table'
import { formatMoney } from '@/lib/utils/format-currency'
import type { PaymentItem } from '../_types'
import type { Receipt } from '@/stores'
import { useAuthStore } from '@/stores'
import { useCapabilities, CAPABILITIES } from '@/lib/permissions'
import { useTranslations } from 'next-intl'
import { usePaymentMethodsCached } from '@/data/hooks'
import { updateReceipt } from '@/data'
import { ReceiptDialogHeader } from './ReceiptDialogHeader'
import { ReceiptDialogFooter } from './ReceiptDialogFooter'
import { ReceiptItemsTable } from './ReceiptItemsTable'

interface AddReceiptDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  /** 預設團 ID（從快速收款按鈕傳入） */
  defaultTourId?: string
  /** 預設訂單 ID（從快速收款按鈕傳入） */
  defaultOrderId?: string
  /** 編輯模式：傳入要編輯的收款單 */
  editingReceipt?: Receipt | null
  /** 編輯模式：更新回呼 */
  onUpdate?: (receiptId: string, data: Partial<Receipt>) => Promise<void>
  /** 編輯模式：刪除回呼 */
  onDelete?: (receiptId: string) => Promise<void>
  /** Dialog 巢狀層級（預設 1；嵌進其他 level=1 dialog 時要設 2）*/
  level?: DialogLevel
}

export function AddReceiptDialog({
  open,
  onOpenChange,
  onSuccess,
  defaultTourId,
  defaultOrderId,
  editingReceipt,
  onUpdate,
  onDelete,
  level = 1,
}: AddReceiptDialogProps) {
  const t = useTranslations('finance')
  const {
    tours,
    formData,
    setFormData,
    paymentItems,
    filteredOrders,
    selectedOrder,
    totalAmount,
    addPaymentItem,
    removePaymentItem,
    updatePaymentItem,
    resetForm,
    validateForm,
    setPaymentItems,
  } = usePaymentForm()

  const { createReceiptWithItems, updateReceiptWithItems } = useReceiptMutations()

  const isEditMode = !!editingReceipt
  const isConfirmed = editingReceipt?.status === 'confirmed'

  const { user: _user } = useAuthStore()
  const { can } = useCapabilities()
  const canManagePayments = can(CAPABILITIES.FINANCE_MANAGE_PAYMENTS)
  const canConfirmCheck = can(CAPABILITIES.FINANCE_CONFIRM_PAYMENTS)
  const canEdit = !isConfirmed || canManagePayments
  const canConfirm = canConfirmCheck && isEditMode && !isConfirmed

  const [activeTab, setActiveTab] = useState('tour')

  // 批量收款 header 欄位（傳給 ReceiptDialogHeader + BatchReceiptDialog）
  const [batchReceiptDate, setBatchReceiptDate] = useState(getTodayString())
  const [batchPaymentMethod, setBatchPaymentMethod] = useState('')
  const [batchTotalAmount, setBatchTotalAmount] = useState(0)

  // 收款項目表格欄位定義
  // 收款金額：所有 payments.write 都能輸（業務也要能輸客戶承諾的金額）
  // 實收金額：只有核帳權限（canConfirmCheck = finance.payments-confirm.write）才看得到
  const receiptColumns: InlineEditColumn<PaymentItem>[] = [
    { key: 'method', label: t('receiptColMethod'), width: '7rem', render: () => null },
    { key: 'date', label: t('receiptColDate'), width: '12.5rem', render: () => null }, // 2026-05-27 William：9.5rem 太窄、日期「年」被切 → 加寬到塞得下整串日期
    { key: 'detail', label: t('receiptColDetail'), width: '11rem', render: () => null },
    { key: 'remarks', label: t('receiptColRemarks'), render: () => null },
    { key: 'amount', label: '收款金額', width: '7.5rem', align: 'right', render: () => null },
    ...(canConfirmCheck
      ? ([
          { key: 'actual', label: '實收金額', width: '7.5rem', align: 'right', render: () => null },
        ] as InlineEditColumn<PaymentItem>[])
      : []),
  ]

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [receiptTransferOpen, setReceiptTransferOpen] = useState(false)

  const { methods: paymentMethods } = usePaymentMethodsCached('receipt')
  const [dialogLoading, setDialogLoading] = useState(false)

  // 當對話框開啟時：載入資料、重置表單、設定預設值
  useEffect(() => {
    if (!open) return

    setIsSubmitting(false)
    setDialogLoading(true)

    const initialize = async () => {
      const { supabase } = await import('@/lib/supabase/client')

      const loadedMethods = paymentMethods

      if (editingReceipt) {
        setFormData({
          tour_id: editingReceipt.tour_id || '',
          order_id: editingReceipt.order_id || '',
          receipt_date: editingReceipt.receipt_date || getTodayString(),
        })

        const extReceipt = editingReceipt as { payment_method_id?: string; payment_method?: string }
        let receiptTypeValue: string | number = editingReceipt.receipt_type ?? 0

        if (extReceipt.payment_method_id && loadedMethods.length > 0) {
          const matched = loadedMethods.find(m => m.id === extReceipt.payment_method_id)
          if (matched) receiptTypeValue = matched.name
        }

        setPaymentItems([
          {
            id: editingReceipt.id,
            receipt_type: receiptTypeValue as number,
            transaction_date: editingReceipt.receipt_date || getTodayString(),
            receipt_account:
              editingReceipt.receipt_account || editingReceipt.bank_account_last5 || '',
            notes: editingReceipt.notes || '',
            amount: editingReceipt.receipt_amount || 0,
            actual_amount: editingReceipt.actual_amount || 0,
            fees: editingReceipt.fees || 0,
          },
        ])
        return
      }

      if (defaultOrderId) {
        const { data: order } = await supabase
          .from('orders')
          .select('tour_id')
          .eq('id', defaultOrderId)
          .single()
        let tourId = order?.tour_id || ''
        if (!tourId) tourId = defaultTourId || ''
        setFormData({ tour_id: tourId, order_id: defaultOrderId, receipt_date: getTodayString() })
      } else if (defaultTourId) {
        setFormData({ tour_id: defaultTourId, order_id: '', receipt_date: getTodayString() })
      } else {
        resetForm()
      }
    }

    initialize()
      .catch(err => logger.error('[initialize]', err))
      .finally(() => setDialogLoading(false))
  }, [open, defaultTourId, defaultOrderId, resetForm, setFormData, editingReceipt, setPaymentItems])

  // 只有一個訂單時自動帶入（編輯模式除外）
  useEffect(() => {
    if (!isEditMode && formData.tour_id && filteredOrders.length === 1 && !formData.order_id) {
      setFormData(prev => ({ ...prev, order_id: filteredOrders[0].id }))
    }
  }, [isEditMode, formData.tour_id, filteredOrders, formData.order_id, setFormData])

  const handleSubmit = async () => {
    if (isSubmitting) return

    const errors = validateForm()
    if (errors.length > 0) {
      toast.error(t('receiptValidationFailed'), { description: errors[0] })
      return
    }

    setIsSubmitting(true)
    try {
      const { useAuthStore: getAuthStore } = await import('@/stores')
      const user = getAuthStore.getState().user
      if (!user?.workspace_id) throw new Error(t('receiptNoWorkspace'))

      if (isEditMode && editingReceipt) {
        // 5/24：改走 updateReceipt entity hook（自動失效快取、不散刻直接寫）
        const defaultUpdate = async (receiptId: string, data: Partial<Receipt>) => {
          await updateReceipt(receiptId, data as Parameters<typeof updateReceipt>[1])
        }

        // 已確認的單在這次儲存時、若實收 / 手續費被覆蓋、append 覆蓋紀錄到 notes
        // 為什麼：對帳時會計可能要把系統算的 fee（13800×2% + 1.68 = 277.68）改成銀行實際扣款、
        // 留紀錄才知道差額為什麼出現（user 5/18 要求）
        let submitItems = paymentItems
        if (isConfirmed) {
          const firstItem = paymentItems[0]
          const oldActual = Number(editingReceipt.actual_amount || 0)
          const oldFees = Number((editingReceipt as unknown as { fees?: number | null }).fees || 0)
          const newActual = Number(firstItem?.actual_amount || 0)
          const newFees = Number(firstItem?.fees || 0)

          if (oldActual !== newActual || oldFees !== newFees) {
            const ts = new Date().toLocaleString('zh-TW', { hour12: false }).replace(/\//g, '-')
            const name =
              user?.display_name ||
              user?.chinese_name ||
              user?.email ||
              (user?.id ? user.id.slice(0, 8) : 'unknown')
            const auditLine = `[${ts} ${name} 覆蓋] 實收 ${oldActual} → ${newActual}, 手續費 ${oldFees} → ${newFees}`
            const newNotes = (firstItem?.notes ? firstItem.notes + '\n' : '') + auditLine
            submitItems = paymentItems.map((it, i) => (i === 0 ? { ...it, notes: newNotes } : it))
          }
        }

        const result = await updateReceiptWithItems({
          receipt: editingReceipt,
          formData,
          paymentItems: submitItems,
          orderInfo: selectedOrder ? { customer_id: selectedOrder.customer_id } : null,
          userId: user.id,
          workspaceId: user.workspace_id,
          onUpdate: onUpdate || defaultUpdate,
        })
        toast.success(t('receiptUpdateSuccess'), {
          description: t('receiptUpdatedDesc', {
            receiptNumber: editingReceipt.receipt_number,
            itemCount: result.itemCount,
          }),
        })
        resetForm()
        onOpenChange(false)
        onSuccess?.()
        return
      }

      const tourInfo = tours.find(t => t.id === (selectedOrder?.tour_id || formData.tour_id))
      const result = await createReceiptWithItems({
        formData,
        paymentItems,
        orderInfo: selectedOrder
          ? {
              tour_id: selectedOrder.tour_id,
              customer_id: selectedOrder.customer_id,
              order_number: selectedOrder.order_number,
              tour_name: selectedOrder.tour_name,
            }
          : null,
        tourInfo: tourInfo ? { id: tourInfo.id, code: tourInfo.code, name: tourInfo.name } : null,
        userId: user.id,
        workspaceId: user.workspace_id,
      })

      toast.success(t('receiptCreateSuccess'), {
        description: t('receiptCreatedDesc', {
          itemCount: result.itemCount,
          totalAmount: formatMoney(result.totalAmount),
        }),
      })
      resetForm()
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      logger.error('[AddReceiptDialog] Create Receipt Error:', error)

      let errorMessage = t('receiptUnknownError')
      if (error instanceof Error) {
        errorMessage = error.message
      } else if (typeof error === 'object' && error !== null) {
        const err = error as { message?: string; error?: string; details?: string; code?: string }
        if (err.message) errorMessage = err.message
        else if (err.error) errorMessage = err.error
        else if (err.details) errorMessage = err.details
        else if (err.code) errorMessage = t('receiptErrorCode', { code: err.code })
        else if (Object.keys(error).length > 0) errorMessage = JSON.stringify(error)
      }

      toast.error(t('receiptBuildFailed'), { description: errorMessage })
    } finally {
      setIsSubmitting(false)
    }
  }

  const orderInfoForTable = selectedOrder
    ? {
        order_number: selectedOrder.order_number || undefined,
        tour_name: selectedOrder.tour_name || undefined,
        contact_person: selectedOrder.contact_person || undefined,
        contact_email: (selectedOrder as { contact_email?: string }).contact_email || undefined,
      }
    : undefined

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent level={level} className="max-w-[95vw] w-[95vw] h-[90vh] flex flex-col">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <ReceiptDialogHeader
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            isEditMode={isEditMode}
            isConfirmed={!!isConfirmed}
            tours={tours}
            filteredOrders={filteredOrders}
            tourId={formData.tour_id}
            orderId={formData.order_id}
            onTourChange={value => setFormData(prev => ({ ...prev, tour_id: value, order_id: '' }))}
            onOrderChange={value => setFormData(prev => ({ ...prev, order_id: value }))}
            batchReceiptDate={batchReceiptDate}
            onBatchReceiptDateChange={setBatchReceiptDate}
            batchPaymentMethod={batchPaymentMethod}
            onBatchPaymentMethodChange={setBatchPaymentMethod}
            batchTotalAmount={batchTotalAmount}
            onBatchTotalAmountChange={setBatchTotalAmount}
            paymentMethods={paymentMethods}
          />

          {/* 團體收款 */}
          <TabsContent value="tour" className="flex-1 overflow-y-auto">
            <ReceiptItemsTable
              rows={paymentItems}
              columns={receiptColumns}
              isConfirmed={!!isConfirmed}
              isEditMode={isEditMode}
              dialogLoading={dialogLoading}
              onAdd={isConfirmed ? undefined : addPaymentItem}
              onUpdate={updatePaymentItem}
              onRemove={removePaymentItem}
              paymentMethods={paymentMethods}
              mode="tour"
              orderInfo={orderInfoForTable}
            />
          </TabsContent>

          {/* 批量收款 */}
          <TabsContent value="batch" className="flex-1 flex flex-col overflow-auto">
            <BatchReceiptDialog
              inline
              open={activeTab === 'batch'}
              onOpenChange={open => {
                if (!open) onOpenChange(false)
              }}
              onSuccess={() => {
                onSuccess?.()
              }}
              receiptDate={batchReceiptDate}
              onReceiptDateChange={setBatchReceiptDate}
              paymentMethod={batchPaymentMethod as never}
              onPaymentMethodChange={m => setBatchPaymentMethod(m as string)}
              totalAmount={batchTotalAmount}
              onTotalAmountChange={setBatchTotalAmount}
            />
          </TabsContent>

          {/* 公司收款 */}
          <TabsContent value="company" className="flex-1 overflow-y-auto">
            <ReceiptItemsTable
              rows={paymentItems}
              columns={receiptColumns}
              isConfirmed={!!isConfirmed}
              isEditMode={isEditMode}
              onAdd={isConfirmed ? undefined : addPaymentItem}
              onUpdate={updatePaymentItem}
              onRemove={removePaymentItem}
              paymentMethods={paymentMethods}
              mode="company"
            />
          </TabsContent>
        </Tabs>

        {/* Footer（batch tab 由 BatchReceiptDialog 自帶 footer、隱藏這層） */}
        {activeTab !== 'batch' && (
          <ReceiptDialogFooter
            totalAmount={totalAmount}
            isEditMode={isEditMode}
            isConfirmed={!!isConfirmed}
            isSubmitting={isSubmitting}
            isDeleting={isDeleting}
            canEdit={canEdit}
            canConfirm={canConfirm}
            tourId={formData.tour_id}
            orderId={formData.order_id}
            paymentItemsCount={paymentItems.length}
            paymentItems={paymentItems}
            editingReceipt={editingReceipt}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onSubmit={handleSubmit}
            onDeleteSuccess={() => {
              resetForm()
              onOpenChange(false)
              onSuccess?.()
            }}
            onConfirmSuccess={() => {
              onSuccess?.()
              onOpenChange(false)
            }}
            onOpenReceiptTransfer={() => setReceiptTransferOpen(true)}
            setIsSubmitting={setIsSubmitting}
            setIsDeleting={setIsDeleting}
          />
        )}
      </DialogContent>

      {/* 收款轉移 Dialog（confirmed 時可用） */}
      {editingReceipt && (
        <ReceiptTransferDialog
          open={receiptTransferOpen}
          onOpenChange={setReceiptTransferOpen}
          sourceReceipt={{
            id: editingReceipt.id,
            receipt_number: editingReceipt.receipt_number,
            tour_id: editingReceipt.tour_id ?? null,
            order_id: (editingReceipt as unknown as { order_id?: string | null }).order_id ?? null,
            tour_code: '',
            tour_name: editingReceipt.tour_name || '',
            receipt_amount: editingReceipt.receipt_amount || 0,
            actual_amount:
              (editingReceipt as unknown as { actual_amount?: number | null }).actual_amount ??
              null,
            fees: (editingReceipt as unknown as { fees?: number | null }).fees ?? null,
            payment_method_id: editingReceipt.payment_method_id,
            payment_method: editingReceipt.payment_method,
            receipt_type: editingReceipt.receipt_type as unknown as number,
          }}
          onSuccess={() => {
            onSuccess?.()
            onOpenChange(false)
          }}
        />
      )}
    </Dialog>
  )
}
