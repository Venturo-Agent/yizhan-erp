'use client'

import { useState, useMemo, useEffect } from 'react'
import { getTodayString } from '@/lib/utils/format-date'
import { useOrdersSlim, useToursSlim, createReceipt, invalidateReceipts } from '@/data'
import { generateReceiptNo } from '@/lib/codes'
import { useAuthStore } from '@/stores'
import { usePaymentMethodsCached } from '@/data/hooks'
import { logger } from '@/lib/utils/logger'
import { PaymentMethod } from '@/stores/types'
import { useTranslations } from 'next-intl'
import { alert } from '@/lib/ui/alert-dialog'

// 擴展 OrderAllocation 加入備註
export interface OrderAllocationWithNote {
  order_id: string
  order_number: string
  tour_id: string
  code: string
  tour_name: string
  contact_person: string
  allocated_amount: number
  notes: string
}

const EMPTY_ALLOCATION: OrderAllocationWithNote = {
  order_id: '',
  order_number: '',
  tour_id: '',
  code: '',
  tour_name: '',
  contact_person: '',
  allocated_amount: 0,
  notes: '',
}

interface UseBatchReceiptFormOptions {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  /** 受控 receiptDate */
  receiptDate?: string
  onReceiptDateChange?: (date: string) => void
  /** 受控 paymentMethod */
  paymentMethod?: PaymentMethod
  onPaymentMethodChange?: (method: PaymentMethod) => void
  /** 受控 totalAmount */
  totalAmount?: number
  onTotalAmountChange?: (n: number) => void
}

export function useBatchReceiptForm({
  open,
  onOpenChange,
  onSuccess,
  receiptDate: externalReceiptDate,
  onReceiptDateChange,
  paymentMethod: externalPaymentMethod,
  onPaymentMethodChange,
  totalAmount: externalTotalAmount,
  onTotalAmountChange,
}: UseBatchReceiptFormOptions) {
  const t = useTranslations('finance')
  const { items: orders } = useOrdersSlim({ all: true })
  const { items: tours } = useToursSlim({ all: true })
  const { user } = useAuthStore()

  // 受控 / 非受控 — receiptDate
  const [internalReceiptDate, setInternalReceiptDate] = useState(getTodayString())
  const isReceiptDateControlled = externalReceiptDate !== undefined
  const receiptDate = isReceiptDateControlled ? externalReceiptDate : internalReceiptDate
  const setReceiptDate = (date: string) => {
    if (isReceiptDateControlled) onReceiptDateChange?.(date)
    else setInternalReceiptDate(date)
  }

  // 受控 / 非受控 — paymentMethod & totalAmount
  const isPaymentMethodControlled = externalPaymentMethod !== undefined
  const isTotalAmountControlled = externalTotalAmount !== undefined
  const [internalPaymentMethod, setInternalPaymentMethod] = useState<PaymentMethod>(
    '' as PaymentMethod
  )
  const [internalTotalAmount, setInternalTotalAmount] = useState(0)
  const paymentMethod = isPaymentMethodControlled
    ? (externalPaymentMethod as PaymentMethod)
    : internalPaymentMethod
  const totalAmount = isTotalAmountControlled
    ? (externalTotalAmount as number)
    : internalTotalAmount
  const setPaymentMethod = (m: PaymentMethod) => {
    if (isPaymentMethodControlled) onPaymentMethodChange?.(m)
    else setInternalPaymentMethod(m)
  }
  const setTotalAmount = (n: number) => {
    if (isTotalAmountControlled) onTotalAmountChange?.(n)
    else setInternalTotalAmount(n)
  }

  // 訂單分配列表
  const [orderAllocations, setOrderAllocations] = useState<OrderAllocationWithNote[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  // 從 DB 讀取的收款方式
  const [_paymentMethods, setPaymentMethods] = useState<{ value: string; label: string }[]>([])
  // 會計科目（選填）
  const [accountingSubjectId, _setAccountingSubjectId] = useState<string>('')
  const [_accountingSubjects, setAccountingSubjects] = useState<{ value: string; label: string }[]>(
    []
  )

  // 原始收款方式資料（含 id）
  const { methods: cachedMethods } = usePaymentMethodsCached('receipt')
  const [paymentMethodsRaw, setPaymentMethodsRaw] = useState<
    { id: string; code: string; name: string }[]
  >([])

  // 同步 SWR 快取到本地 state
  useEffect(() => {
    if (cachedMethods.length > 0) {
      const methods = cachedMethods as { id: string; code: string; name: string }[]
      setPaymentMethodsRaw(methods)
      setPaymentMethods(methods.map(m => ({ value: m.id, label: m.name })))
      if (!paymentMethod && methods.length > 0) {
        setPaymentMethod(methods[0].id as PaymentMethod)
      }

      // 載入會計科目（收入類）
      fetch(
        `/api/finance/accounting-subjects?workspace_id=${user?.workspace_id || ''}&type=revenue`
      )
        .then(res => res.json())
        .then(data => {
          const subjects = Array.isArray(data) ? data : []
          setAccountingSubjects(
            subjects.map((s: { id: string; code: string; name: string }) => ({
              value: s.id,
              label: `${s.code} ${s.name}`,
            }))
          )
        })
        .catch(() => {})
    }
  }, [user?.workspace_id])

  // 可用訂單（未收款或部分收款）
  const availableOrders = useMemo(() => {
    return orders.filter(
      order => order.payment_status === 'unpaid' || order.payment_status === 'partial'
    )
  }, [orders])

  // 已選擇的訂單 ID
  const selectedOrderIds = useMemo(() => {
    return new Set(orderAllocations.filter(a => a.order_id).map(a => a.order_id))
  }, [orderAllocations])

  // 計算已分配金額
  const totalAllocatedAmount = useMemo(() => {
    return orderAllocations.reduce((sum, allocation) => sum + allocation.allocated_amount, 0)
  }, [orderAllocations])

  // 未分配金額
  const unallocatedAmount = totalAmount - totalAllocatedAmount

  // 初始化（預設兩個空白行）
  useEffect(() => {
    if (open) {
      setReceiptDate(getTodayString())
      if (paymentMethodsRaw.length > 0) {
        setPaymentMethod(paymentMethodsRaw[0].id as PaymentMethod)
      }
      setTotalAmount(0)
      setOrderAllocations([{ ...EMPTY_ALLOCATION }, { ...EMPTY_ALLOCATION }])
    }
  }, [open])

  // 新增訂單分配（空白行）
  const addOrderAllocation = () => {
    setOrderAllocations(prev => [...prev, { ...EMPTY_ALLOCATION }])
  }

  // 移除訂單分配
  const removeOrderAllocation = (index: number) => {
    setOrderAllocations(prev => prev.filter((_, i) => i !== index))
  }

  // 更新訂單分配
  const updateOrderAllocation = (index: number, updates: Partial<OrderAllocationWithNote>) => {
    setOrderAllocations(prev =>
      prev.map((allocation, i) => (i === index ? { ...allocation, ...updates } : allocation))
    )
  }

  // 選擇訂單
  const selectOrder = (index: number, orderId: string) => {
    const order = orders.find(o => o.id === orderId)
    if (!order) return

    // SSOT：order_number 為訂單編號 SSOT、code 欄位廢棄（2026-05-13 William 拍板 A1）
    updateOrderAllocation(index, {
      order_id: order.id,
      order_number: order.order_number || '',
      tour_id: order.tour_id ?? '',
      code: order.order_number || '',
      tour_name: order.tour_name || '',
      contact_person: order.contact_person ?? '',
    })
  }

  // 平均分配
  const distributeEvenly = () => {
    const validAllocations = orderAllocations.filter(a => a.order_id)
    if (validAllocations.length === 0 || totalAmount <= 0) return

    const amountPerOrder = Math.floor(totalAmount / validAllocations.length)
    const remainder = totalAmount - amountPerOrder * validAllocations.length

    let validIndex = 0
    setOrderAllocations(prev =>
      prev.map(allocation => {
        if (!allocation.order_id) return allocation
        const amount = amountPerOrder + (validIndex === 0 ? remainder : 0)
        validIndex++
        return { ...allocation, allocated_amount: amount }
      })
    )
  }

  // 重置表單
  const resetForm = () => {
    setReceiptDate(getTodayString())
    if (paymentMethodsRaw.length > 0) {
      setPaymentMethod(paymentMethodsRaw[0].id as PaymentMethod)
    }
    setTotalAmount(0)
    setOrderAllocations([{ ...EMPTY_ALLOCATION }, { ...EMPTY_ALLOCATION }])
  }

  // 儲存
  const handleSave = async () => {
    if (isSubmitting) return
    setIsSubmitting(true)

    const validAllocations = orderAllocations.filter(a => a.order_id && a.allocated_amount > 0)

    if (validAllocations.length === 0) {
      void alert(t('batchReceiptMinOne'), 'warning')
      setIsSubmitting(false)
      return
    }

    if (totalAmount === 0) {
      void alert(t('batchReceiptAmountNotZero'), 'warning')
      setIsSubmitting(false)
      return
    }

    if (unallocatedAmount !== 0) {
      void alert(
        t('batchReceiptUnallocatedMsg', {
          amount: Math.abs(unallocatedAmount).toLocaleString('zh-TW'),
          status: unallocatedAmount > 0 ? t('batchReceiptUnallocated') : t('batchReceiptExceeds'),
        }),
        'warning'
      )
      setIsSubmitting(false)
      return
    }

    if (!user?.workspace_id) {
      void alert(t('receiptNoWorkspace'), 'error')
      setIsSubmitting(false)
      return
    }

    try {
      const selectedPaymentMethod = paymentMethodsRaw.find(m => m.id === paymentMethod)
      const paymentMethodId = selectedPaymentMethod?.id || null
      const paymentMethodName = selectedPaymentMethod?.name || '現金'

      // 映射到 receipt_type 數字（用於舊欄位向下相容）
      const nameToReceiptType: Record<string, number> = {
        現金: 1,
        匯款: 0,
        刷卡: 2,
        信用卡: 2,
        支票: 3,
        'LINE Pay': 4,
      }
      const receiptTypeNum = nameToReceiptType[paymentMethodName] ?? 0

      for (const allocation of validAllocations) {
        const order = orders.find(o => o.id === allocation.order_id)
        if (!order) continue

        const tour = order.tour_id ? tours.find(t => t.id === order.tour_id) : null
        const tourCode = tour?.code || ''

        if (!tourCode || !order.tour_id) {
          logger.warn(`訂單 ${order.order_number} 沒有關聯團號，跳過`)
          continue
        }

        let receiptNumber: string
        try {
          receiptNumber = await generateReceiptNo(order.tour_id)
        } catch (e) {
          logger.warn(`訂單 ${order.order_number} 生成收款單號失敗、跳過`, e)
          continue
        }

        await createReceipt({
          receipt_number: receiptNumber,
          workspace_id: user.workspace_id,
          order_id: allocation.order_id,
          tour_id: order.tour_id || null,
          customer_id: order.customer_id || null,
          order_number: order.order_number || '',
          tour_name: order.tour_name || tour?.name || '',
          receipt_date: receiptDate,
          payment_date: receiptDate,
          payment_method: paymentMethodName,
          payment_method_id: paymentMethodId,
          receipt_type: receiptTypeNum,
          receipt_amount: allocation.allocated_amount,
          actual_amount: 0,
          status: 'pending',
          notes: allocation.notes || null,
          created_by: user.id,
          updated_by: user.id,
          accounting_subject_id: accountingSubjectId || null,
          receipt_account: null,
          fees: null,
          is_active: true,
        })
      }

      await invalidateReceipts()
      await alert(t('batchReceiptSuccess', { count: validAllocations.length }), 'success')
      onSuccess?.()
      onOpenChange(false)
      resetForm()
    } catch (error) {
      logger.error('批量收款建立失敗:', error)
      void alert(t('batchReceiptFailed'), 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return {
    // state
    orders,
    receiptDate,
    paymentMethod,
    totalAmount,
    orderAllocations,
    isSubmitting,
    availableOrders,
    selectedOrderIds,
    totalAllocatedAmount,
    unallocatedAmount,
    // actions
    setReceiptDate,
    setPaymentMethod,
    setTotalAmount,
    addOrderAllocation,
    removeOrderAllocation,
    updateOrderAllocation,
    selectOrder,
    distributeEvenly,
    resetForm,
    handleSave,
  }
}
