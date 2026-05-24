'use client'

/**
 * useReceiptListActions — 收款列表頁的列動作（核准 / 編輯 / 刪除）+ 樂觀更新
 * （B 階段：搭配 useReceiptsListView 伺服器分頁。從舊 usePaymentData 抽出寫入那半。）
 *
 * 為什麼存在：
 * - 舊 usePaymentData 同時「entity hook 全撈讀取 + 列動作寫入」綁死。B 階段讀取改走
 *   useReceiptsListView（伺服器分頁），讀取那半不再需要；只剩「核准 / 編輯 / 刪除」+ 樂觀更新。
 * - 本 hook 只負責列動作：吃當前頁 `rawReceipts`（核准時讀手續費等欄位）+ 一個 `refresh` callback。
 * - 注意：跟 `useReceiptMutations`（createReceiptWithItems / updateReceiptWithItems、給新增對話框用）
 *   是不同責任、不要混淆。
 *
 * 寫入後刷新（難點、紅線 F）：
 * - 收款資料有兩個 cache 源：① entity hook（useReceipts、被 tours 財務分頁 / finance dashboard /
 *   treasury / reports 共用）② 本頁的 list-view 分頁 key。
 * - 寫入後**兩個都要刷**才不會某些頁顯示舊資料。集中在 page 傳進來的 `refresh`
 *   （= invalidateReceipts() + listView.refresh()）一處處理、本 hook 只呼叫它。
 *
 * 樂觀更新（optimisticStatus）：
 * - 核准按下去立刻把該列改 confirmed、UI 秒變、server 整串（update + recalc + 手續費單 + 傳票）背景跑。
 * - 失敗 rollback + toast；成功 + refresh 完清掉 optimistic、讓 server 真實值接位。
 */

import { logger } from '@/lib/utils/logger'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores'
import { updateReceipt, deleteReceipt } from '@/data'
import { recalculateReceiptStats } from '@/app/(main)/finance/payments/_services/receipt-core.service'
import { apiMutate } from '@/lib/swr/api-mutate'
import { useTranslations } from 'next-intl'
import type { Receipt } from '@/types/receipt.types'

interface UseReceiptListActionsResult {
  /** rawReceipts 套上 optimistic 覆寫後的列表（給 UI 顯示） */
  receipts: Receipt[]
  handleConfirmReceipt: (receiptId: string) => void
  handleUpdateReceipt: (receiptId: string, data: Partial<Receipt>) => Promise<void>
  handleDeleteReceipt: (receiptId: string) => Promise<void>
}

export function useReceiptListActions(
  rawReceipts: Receipt[],
  refresh: () => Promise<void>
): UseReceiptListActionsResult {
  const t = useTranslations('finance')
  const { user } = useAuthStore()

  // 樂觀更新 state：收款核准按下去立刻變狀態、後台慢慢跑。失敗 / refresh 完成後清掉。
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

  // 確認收款（狀態改 confirmed、actual_amount 沿用建單時自動算的值、不覆蓋）
  // 確認後自動產生會計傳票（含手續費三行分錄）
  //
  // 樂觀更新 + fire-and-forget：
  //   - 按下去立刻 setOptimisticStatus、UI 秒變 confirmed、user 體感即時
  //   - server 整串（update + recalc + voucher + refresh）背景跑
  //   - 失敗 rollback optimistic + toast、user 看到 UI 變回 pending
  const handleConfirmReceipt = (receiptId: string) => {
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
            const requestDate = receipt.receipt_date || nowIso.slice(0, 10)

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

        await refresh()
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

  // 更新收款單（編輯模式使用、由 AddReceiptDialog 的 updateReceiptWithItems 當 onUpdate 呼叫）
  const handleUpdateReceipt = async (receiptId: string, data: Partial<Receipt>) => {
    if (!user?.id) {
      throw new Error(t('pleaseLogin'))
    }

    await updateReceipt(receiptId, {
      ...data,
      updated_by: user.id,
    })

    await refresh()
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

    await refresh()
  }

  return {
    receipts,
    handleConfirmReceipt,
    handleUpdateReceipt,
    handleDeleteReceipt,
  }
}
