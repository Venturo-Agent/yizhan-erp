/**
 * 收款管理資料處理 Hook
 */

import { logger } from '@/lib/utils/logger'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
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
import { apiMutate } from '@/lib/swr/api-mutate'

export function usePaymentData() {
  const t = useTranslations('finance')
  const { items: orders, loading: ordersLoading } = useOrdersSlim()
  const {
    items: rawReceipts,
    loading: receiptsLoading,
    refresh: refreshReceiptsHook,
  } = useReceipts()

  // 樂觀更新 state：收款核准等動作按下去立刻變狀態、後台慢慢跑
  // 失敗 / refresh 完成後清掉、讓 server 真實值顯示
  const [optimisticStatus, setOptimisticStatus] = useState<Record<string, string>>({})

  // 合併 raw receipts + optimistic 覆寫
  const receipts = useMemo(
    () =>
      rawReceipts.map(r =>
        optimisticStatus[r.id]
          ? ({ ...r, status: optimisticStatus[r.id] as typeof r.status })
          : r
      ),
    [rawReceipts, optimisticStatus]
  )

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
    // 5/18 直擊：globalMutate(predicate) 對 entity hook cache key 不可靠、
    // 改 await 本 hook 自己的 refresh()（individual mutate(swrKey)、SWR 對單一 key 行為穩）
    await invalidateReceipts()
    await refreshReceiptsHook()
  }

  // 確認收款（狀態改 confirmed、actual_amount 沿用建單時自動算的值、不覆蓋）
  // 確認後自動產生會計傳票（含手續費三行分錄）
  //
  // 5/18 改樂觀更新 + fire-and-forget：
  //   - 按下去立刻 setOptimisticStatus、UI 秒變 confirmed、user 體感即時
  //   - server 整串（update + recalc + voucher + refresh）背景跑
  //   - 失敗 rollback optimistic + toast、user 看到 UI 變回 pending
  const handleConfirmReceipt = async (receiptId: string) => {
    if (!user?.id) {
      throw new Error(t('pleaseLogin'))
    }

    const receipt = rawReceipts.find(r => r.id === receiptId)

    // 樂觀更新：立刻在 UI 顯示 confirmed
    setOptimisticStatus(prev => ({ ...prev, [receiptId]: 'confirmed' }))

    // 背景跑、不擋 button
    void (async () => {
      try {
        // 撈付款方式設定算 fees + actual_amount（跟 dialog 內按確認一致）
        // 為什麼：5/18 W 反饋 — 列表核准沒算實收、會計按完看到實收 0、得手動補
        let calcActual = Number(receipt?.receipt_amount || 0)
        let calcFees: number | null = null
        const methodId =
          (receipt as unknown as { payment_method_id?: string | null })?.payment_method_id ||
          null
        if (methodId) {
          const { supabase } = await import('@/lib/supabase/client')
          const { data: method } = await supabase
            .from('payment_methods')
            .select('fee_percent, fee_fixed')
            .eq('id', methodId)
            .maybeSingle()
          const feePercent = Number(method?.fee_percent || 0)
          const feeFixed = Number(method?.fee_fixed || 0)
          const receiptAmount = Number(receipt?.receipt_amount || 0)
          calcFees = Math.round((receiptAmount * feePercent) / 100) + feeFixed
          calcActual = receiptAmount - calcFees
        }

        await updateReceipt(receiptId, {
          status: 'confirmed',
          actual_amount: calcActual,
          fees: calcFees,
          updated_by: user.id,
        })

        if (receipt) {
          await recalculateReceiptStats(receipt.order_id, receipt.tour_id || null)
        }

        // 2026-05-21 William 拍板（方案 1）：fees > 0 → 自動產生「手續費請款單」
        // - status='paid' 直接付款（不走出納流程）
        // - source_type='receipt_fee' + source_id=receipt.id 給審計反查
        // - notes 寫對應收款方式（會計對帳用）、supplier 不顯示
        // - 失敗不擋主流程（會計可手動補）
        if (calcFees && calcFees > 0 && receipt && user.workspace_id) {
          try {
            const [{ generateCompanyPaymentRequestCode }, dataMod, sbMod] = await Promise.all([
              import('@/lib/codes'),
              import('@/data'),
              import('@/lib/supabase/client'),
            ])
            const { createPaymentRequest, createPaymentRequestItem } = dataMod
            const { supabase: sbClient } = sbMod

            // 抓收款方式名稱（給 notes 用）
            let methodName = '—'
            if (methodId) {
              const { data: m } = await sbClient
                .from('payment_methods')
                .select('name')
                .eq('id', methodId)
                .maybeSingle()
              methodName = m?.name || '—'
            }

            const feeCode = await generateCompanyPaymentRequestCode(
              user.workspace_id,
              'FEE',
              receipt.receipt_date || new Date()
            )
            const nowIso = new Date().toISOString()
            const requestDate =
              receipt.receipt_date || nowIso.slice(0, 10)

            const feeRequest = (await createPaymentRequest({
              code: feeCode,
              request_number: feeCode,
              request_date: requestDate,
              request_type: '手續費',
              request_category: 'company',
              expense_type: 'FEE',
              tour_id: null,
              supplier_id: null,
              supplier_name: null,
              amount: calcFees,
              total_amount: calcFees,
              status: 'paid',
              payment_method_id: methodId,
              source_type: 'receipt_fee',
              source_id: receiptId,
              paid_by: user.id,
              paid_at: nowIso,
              notes: `收款 ${receipt.receipt_number || receiptId} 之手續費（${methodName}）`,
            } as never)) as unknown as { id: string }

            await createPaymentRequestItem({
              request_id: feeRequest.id,
              item_number: 1,
              sort_order: 0,
              category: 'FEE',
              description: '銀行手續費',
              quantity: 1,
              unit_price: calcFees,
              subtotal: calcFees,
              custom_request_date: null,
              payment_method_id: methodId,
            } as never)
          } catch (feeErr) {
            logger.error('自動產生手續費請款單失敗:', feeErr)
            // 不擋主流程：收款仍 confirmed、之後可由會計手動補
          }
        }

        // 產生傳票（沒啟用會計 / 沒綁科目 → API throw、catch 吞掉、不中斷確認流程）
        try {
          const wsId = user?.workspace_id
          if (wsId) {
            await apiMutate('/api/accounting/vouchers/auto-create', {
              method: 'POST',
              body: {
                source_type: 'receipt',
                source_id: receiptId,
                workspace_id: wsId,
              },
            })
          }
        } catch (err) {
          logger.error('產生收款傳票失敗:', err)
        }

        await invalidateReceipts()
        await refreshReceiptsHook()
      } catch (err) {
        // 失敗 rollback、UI 變回 pending
        setOptimisticStatus(prev => {
          const next = { ...prev }
          delete next[receiptId]
          return next
        })
        logger.error('確認收款失敗:', err)
        toast.error('確認失敗、請再試一次')
        return
      }

      // 成功 + refresh 完、清掉 optimistic（讓 server 真實值接位）
      setOptimisticStatus(prev => {
        const next = { ...prev }
        delete next[receiptId]
        return next
      })
    })()
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
    // 5/18 直擊：globalMutate(predicate) 對 entity hook cache key 不可靠、
    // 改 await 本 hook 自己的 refresh()（individual mutate(swrKey)、SWR 對單一 key 行為穩）
    await invalidateReceipts()
    await refreshReceiptsHook()
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
    // 5/18 直擊：globalMutate(predicate) 對 entity hook cache key 不可靠、
    // 改 await 本 hook 自己的 refresh()（individual mutate(swrKey)、SWR 對單一 key 行為穩）
    await invalidateReceipts()
    await refreshReceiptsHook()
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
