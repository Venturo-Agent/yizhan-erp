/**
 * 收款管理資料處理 Hook
 */

import { logger } from '@/lib/utils/logger'
import { useMemo } from 'react'
import { useAuthStore } from '@/stores'
import {
  useOrdersSlim,
  useTourDictionary,
  useReceipts,
  createReceipt,
  updateReceipt,
  deleteReceipt,
  invalidateReceipts,
} from '@/data'
import { recalculateReceiptStats } from '@/app/(main)/finance/payments/_services/receipt-core.service'
import { generateReceiptNo } from '@/lib/codes'
import type { ReceiptItem } from '@/stores'
import { codeToPaymentMethod, codeToReceiptType } from '@/types/receipt.types'
import { useTranslations } from 'next-intl'

export function usePaymentData() {
  const t = useTranslations('finance')
  const { items: orders, loading: ordersLoading } = useOrdersSlim()
  const { items: receipts, loading: receiptsLoading } = useReceipts()

  // 合併 loading 狀態
  const loading = ordersLoading || receiptsLoading
  const { get: getTour } = useTourDictionary()
  const { user } = useAuthStore()

  // 過濾可用訂單（未收款或部分收款）
  const availableOrders = useMemo(() => {
    return orders.filter(
      order => order.payment_status === 'unpaid' || order.payment_status === 'partial'
    )
  }, [orders])

  const handleCreateReceipt = async (data: {
    selectedOrderId: string
    paymentItems: ReceiptItem[]
  }) => {
    const { selectedOrderId, paymentItems } = data

    if (!selectedOrderId || paymentItems.length === 0 || !user?.id) {
      throw new Error(t('fillCompleteInfo'))
    }

    const selectedOrder = orders.find(order => order.id === selectedOrderId)

    // 取得團號（從訂單關聯的旅遊團）- 使用 Dictionary O(1) 查詢
    const tour = selectedOrder?.tour_id ? getTour(selectedOrder.tour_id) : undefined
    const tourCode = tour?.code || ''
    if (!tourCode) {
      throw new Error(t('cannotGetTourCode'))
    }

    // 為每個收款項目建立收款單
    for (const item of paymentItems) {
      // 生成收款單號 — 透過中央 codes module（RPC + advisory lock）
      const receiptNumber = await generateReceiptNo(selectedOrder?.tour_id || '')

      // 建立收款單
      const _receipt = await createReceipt({
        receipt_number: receiptNumber,
        workspace_id: user.workspace_id || '',
        order_id: selectedOrderId,
        tour_id: selectedOrder?.tour_id || null, // 直接關聯團號
        customer_id: selectedOrder?.customer_id || null, // 付款人
        order_number: selectedOrder?.order_number || '',
        tour_name: selectedOrder?.tour_name || '',
        receipt_date: item.transaction_date,
        payment_date: item.transaction_date,
        // SSOT: payment_method_id 是真相（FK to payment_methods）
        // payment_method 字串 + receipt_type 數字皆從 method.code 反推、給 DB trigger 兼容
        payment_method_id: item.payment_method_id || null,
        payment_method: codeToPaymentMethod(item.payment_method_code),
        receipt_type: codeToReceiptType(item.payment_method_code),
        receipt_amount: item.amount,
        actual_amount: 0, // 待會計確認
        status: 'pending', // 待確認
        receipt_account: item.receipt_account || null,
        fees: item.fees || null,
        notes: item.notes || null,
        is_active: true,
        created_by: user.id,
        updated_by: user.id,
      })
    }

    // 重算訂單付款狀態 + 團財務數據
    await recalculateReceiptStats(selectedOrderId, selectedOrder?.tour_id || null)

    // 重新載入資料
    await invalidateReceipts()
  }

  // 確認收款（狀態改 confirmed、actual_amount 沿用建單時自動算的值、不覆蓋）
  // 確認後自動產生會計傳票（含手續費三行分錄）
  const handleConfirmReceipt = async (receiptId: string) => {
    if (!user?.id) {
      throw new Error(t('pleaseLogin'))
    }

    const receipt = receipts.find(r => r.id === receiptId)

    await updateReceipt(receiptId, {
      status: 'confirmed',
      updated_by: user.id,
    })

    if (receipt) {
      await recalculateReceiptStats(receipt.order_id, receipt.tour_id || null)
    }

    // 產生傳票（沒啟用會計 / 沒綁科目 → API throw、catch 吞掉、不中斷確認流程）
    try {
      const wsId = user?.workspace_id
      if (wsId) {
        await fetch('/api/accounting/vouchers/auto-create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source_type: 'receipt',
            source_id: receiptId,
            workspace_id: wsId,
          }),
        })
      }
    } catch (err) {
      logger.error('產生收款傳票失敗:', err)
    }

    await invalidateReceipts()
  }

  // 更新收款單（編輯模式使用）
  const handleUpdateReceipt = async (receiptId: string, data: Partial<(typeof receipts)[0]>) => {
    if (!user?.id) {
      throw new Error(t('pleaseLogin'))
    }

    await updateReceipt(receiptId, {
      ...data,
      updated_by: user.id,
    })

    // 重新載入資料
    await invalidateReceipts()
  }

  // 刪除收款單
  const handleDeleteReceipt = async (receiptId: string) => {
    if (!user?.id) {
      throw new Error(t('pleaseLogin'))
    }

    // 檢查收款單是否已確認
    const receipt = receipts.find(r => r.id === receiptId)
    if (receipt?.status === 'confirmed') {
      throw new Error(t('confirmedCannotDelete'))
    }

    await deleteReceipt(receiptId)

    // 重算訂單付款狀態 + 團財務數據
    if (receipt) {
      await recalculateReceiptStats(receipt.order_id, receipt.tour_id || null)
    }

    // 重新載入資料
    await invalidateReceipts()
  }

  return {
    receipts,
    orders,
    availableOrders,
    user,
    loading,
    invalidateReceipts,
    handleCreateReceipt,
    handleConfirmReceipt,
    handleUpdateReceipt,
    handleDeleteReceipt,
  }
}
