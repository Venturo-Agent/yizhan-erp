/**
 * Receipt Mutations Hook
 * 收款單新增/更新操作
 */

import { logger } from '@/lib/utils/logger'
import { useCallback } from 'react'
import { useTranslations } from 'next-intl'
import type { PaymentItem, PaymentFormData } from '../_types'
import type { Receipt } from '@/types/receipt.types'
import { codeToReceiptType, codeToPaymentMethod } from '@/types/receipt.types'
import { recalculateReceiptStats } from '../_services/receipt-core.service'
import { generateReceiptNo } from '@/lib/codes'

/** 將 PaymentItem 解析成 method.code（SSOT）：優先 payment_method_code、fallback 從 receipt_type 字串/數字推 */
function resolveMethodCode(item: PaymentItem): string {
  if (item.payment_method_code) return item.payment_method_code
  // 舊資料：receipt_type 是 string 名稱（譬如「匯款-國泰」）
  const rt: unknown = item.receipt_type
  if (typeof rt === 'string') {
    const n = rt.toLowerCase()
    if (n.includes('現金') || n.includes('cash')) return 'CASH'
    if (n.includes('信用卡') || n.includes('刷卡') || n.includes('card')) return 'CREDIT_CARD'
    if (n.includes('支票') || n.includes('check')) return 'CHECK'
    if (n.includes('匯款') || n.includes('transfer')) return 'TRANSFER'
  }
  // 數字 fallback
  if (typeof rt === 'number') {
    return ['TRANSFER', 'CASH', 'CREDIT_CARD', 'CHECK'][rt] || 'TRANSFER'
  }
  return 'TRANSFER'
}

interface OrderInfo {
  tour_id?: string | null
  customer_id?: string | null
  order_number?: string | null
  tour_name?: string | null
}

interface TourInfo {
  id: string
  code?: string
  name?: string
}

interface CreateReceiptWithItemsParams {
  formData: PaymentFormData
  paymentItems: PaymentItem[]
  orderInfo: OrderInfo | null
  tourInfo: TourInfo | null
  userId: string
  workspaceId: string
}

interface CreateReceiptWithItemsResult {
  success: boolean
  receiptId: string
  receiptNumber: string
  totalAmount: number
  itemCount: number
}

interface UpdateReceiptWithItemsParams {
  receipt: Receipt
  formData: PaymentFormData
  paymentItems: PaymentItem[]
  orderInfo: OrderInfo | null
  userId: string
  workspaceId: string
  onUpdate: (receiptId: string, data: Partial<Receipt>) => Promise<void>
}

interface UpdateReceiptWithItemsResult {
  success: boolean
  itemCount: number
}

export function useReceiptMutations() {
  const t = useTranslations('finance')

  /**
   * 建立收款單 + 多個收款項目
   */
  const createReceiptWithItems = useCallback(
    async (params: CreateReceiptWithItemsParams): Promise<CreateReceiptWithItemsResult> => {
      const { formData, paymentItems, orderInfo, tourInfo, userId, workspaceId } = params

      const { createReceipt, updateReceipt } = await import('@/data')
      const { supabase } = await import('@/lib/supabase/client')

      const tourId = orderInfo?.tour_id || formData.tour_id
      const tourCode = tourInfo?.code || ''

      if (!tourCode) {
        throw new Error(t('receiptMutationCannotGetTourCode'))
      }

      // 守門：提案 / 模板狀態的旅遊團不可開立收款單（業務規則）
      // 譬喻：飯店不對「報價單客人」或「房型範本」開帳單、必須是已成立的訂單
      if (tourId) {
        const { isDraftTourStatus } = await import('@/lib/constants/tour-status')
        const { data: tourRow } = await supabase
          .from('tours')
          .select('status')
          .eq('id', tourId)
          .maybeSingle()
        if (isDraftTourStatus(tourRow?.status)) {
          throw new Error('提案 / 模板狀態的旅遊團不可開立收款單、請先將提案轉為正式團')
        }
      }

      // 查詢 payment_methods 取得 ID 對照表
      const { data: paymentMethodsData } = await supabase
        .from('payment_methods')
        .select('id, code, name')
        .eq('workspace_id', workspaceId)
        .eq('type', 'receipt')
        .eq('is_active', true)

      const getPaymentMethodId = (item: PaymentItem): string => {
        if (!paymentMethodsData?.length) return ''
        // SSOT：優先用 PaymentItem 已寫入的 method.id
        if (item.payment_method_id) {
          const m = paymentMethodsData.find(m => m.id === item.payment_method_id)
          if (m) return m.id
        }
        // 舊資料 fallback：用 receipt_type 字串 / payment_method_code 比對
        const code = resolveMethodCode(item)
        const byCode = paymentMethodsData.find(m => m.code === code)
        return byCode?.id || paymentMethodsData[0]?.id || ''
      }

      // 編號改透過 DB RPC generate_receipt_no(tour_id) 在迴圈內逐筆生成
      // 每筆呼叫含 advisory lock、INSERT commit 後下一次 RPC 才能看到新 row、序列遞增
      const prefix = `${tourCode}-R`

      // 計算總金額
      const totalAmount = paymentItems.reduce((sum, item) => sum + (item.amount || 0), 0)

      let firstReceiptId: string | null = null
      let firstReceiptNumber: string | null = null

      // 統一處理所有收款項目 — 每個品項獨立流水號
      for (let i = 0; i < paymentItems.length; i++) {
        const item = paymentItems[i]
        // SSOT 流：先解析 method.code、再從 code 反推 receipt_type 數字 + payment_method 字串
        const methodCode = resolveMethodCode(item)
        const receiptTypeNum = codeToReceiptType(methodCode)
        const paymentMethod = codeToPaymentMethod(methodCode)
        const paymentMethodId = getPaymentMethodId(item)

        // 每個品項獨立編號 — 透過中央 codes module（RPC + advisory lock）
        // 安全：每筆 createReceipt 已 await（commit）後才生下一號、RPC 讀已 commit row 遞增 + 同團 advisory lock；
        // 非規則針對的「先收集 N 號再 insert」撞號 pattern。
        // eslint-disable-next-line venturo/no-in-loop-number-rpc
        const itemReceiptNumber = await generateReceiptNo(tourId)

        logger.info('[createReceiptWithItems] Creating receipt...', {
          index: i,
          receiptNumber: itemReceiptNumber,
          receiptType: receiptTypeNum,
          amount: item.amount,
          paymentItemsCount: paymentItems.length,
        })

        const createdReceipt = await createReceipt({
          receipt_number: itemReceiptNumber,
          workspace_id: workspaceId,
          order_id: formData.order_id || null,
          tour_id: tourId || null,
          customer_id: orderInfo?.customer_id || null,
          order_number: orderInfo?.order_number || '',
          tour_name: orderInfo?.tour_name || tourInfo?.name || '',
          payment_date: item.transaction_date || new Date().toISOString().split('T')[0],
          payment_method: paymentMethod,
          payment_method_id: paymentMethodId,
          receipt_date: item.transaction_date || new Date().toISOString().split('T')[0],
          receipt_type: receiptTypeNum,
          receipt_amount: item.amount,
          actual_amount: item.actual_amount ?? item.amount,
          status: 'pending',
          batch_id: paymentItems.length > 1 && firstReceiptId ? firstReceiptId : null,
          receipt_account: item.receipt_account || null,
          fees: item.fees || null,
          notes: item.notes || null,
          created_by: userId,
          updated_by: userId,
          is_active: true,
        })

        if (!createdReceipt?.id) {
          throw new Error(t('receiptMutationCreateFailed'))
        }

        // 第一筆的 ID 作為 batch_id（多筆時）
        if (i === 0) {
          firstReceiptId = createdReceipt.id
          firstReceiptNumber = itemReceiptNumber as string
          // 多筆時，第一筆也要設 batch_id（指向自己）
          if (paymentItems.length > 1) {
            await updateReceipt(createdReceipt.id, { batch_id: firstReceiptId })
          }
        }
      }

      // 3. 重算訂單付款狀態 + 團財務數據 + 刷新快取
      await recalculateReceiptStats(formData.order_id, tourId || null)

      // 自動傳票改在「確認收款」時產生（用實收金額 actual_amount）、不在建單時產生

      return {
        success: true,
        receiptId: firstReceiptId || '',
        receiptNumber: firstReceiptNumber || `${prefix}01`,
        totalAmount,
        itemCount: paymentItems.length,
      }
    },
    [t]
  )

  /**
   * 更新收款單
   * ADR-001: 簡化版，只更新主表
   */
  const updateReceiptWithItems = useCallback(
    async (params: UpdateReceiptWithItemsParams): Promise<UpdateReceiptWithItemsResult> => {
      const { receipt, formData, paymentItems, onUpdate } = params

      // 計算總金額 + 實收金額（扣完手續費）
      const totalAmount = paymentItems.reduce((sum, item) => sum + (item.amount || 0), 0)
      const totalActual = paymentItems.reduce(
        (sum, item) => sum + (item.actual_amount ?? item.amount ?? 0),
        0
      )

      // 取第一個項目的收款方式（SSOT：method.code 為唯一真相）
      const firstItem = paymentItems[0]
      const methodCode = firstItem ? resolveMethodCode(firstItem) : 'TRANSFER'
      const receiptTypeNum = codeToReceiptType(methodCode)
      const paymentMethod = codeToPaymentMethod(methodCode)

      // 更新收款單主表
      // receipt_date / payment_date：優先 formData.receipt_date（dialog header）
      // fallback 到 row 內 transaction_date（兼容兩處編輯日期的 UI）
      // user 改 row 內 transaction_date 優先（dialog header 沒收款日期 input、靠 row 內）
      const receiptDate = firstItem?.transaction_date || formData.receipt_date || undefined
      await onUpdate(receipt.id, {
        tour_id: formData.tour_id || null,
        order_id: formData.order_id || null,
        receipt_date: receiptDate,
        payment_date: receiptDate,
        receipt_amount: totalAmount,
        actual_amount: totalActual,
        payment_method: paymentMethod,
        receipt_type: receiptTypeNum,
        receipt_account: firstItem?.receipt_account || null,
        fees: firstItem?.fees || null,
        notes: firstItem?.notes || null,
      })

      return {
        success: true,
        itemCount: paymentItems.length,
      }
    },
    []
  )

  return {
    createReceiptWithItems,
    updateReceiptWithItems,
  }
}
