/**
 * Payment Form Hook
 * 收款表單狀態管理
 */

import { getTodayString } from '@/lib/utils/format-date'
import { useState, useCallback, useMemo, useEffect } from 'react'
import { useOrdersSlim } from '@/data'
import type { PaymentFormData, PaymentItem } from '../_types'
import { useTranslations } from 'next-intl'

interface TourSlim {
  id: string
  code: string
  name: string
}

export function usePaymentForm() {
  const t = useTranslations('finance')
  const { items: orders } = useOrdersSlim({ all: true })

  // 只載入正式團（從 API 層過濾，省流量）
  const [tours, setTours] = useState<TourSlim[]>([])

  useEffect(() => {
    const loadOfficialTours = async () => {
      const { useAuthStore } = await import('@/stores')
      const { supabase } = await import('@/lib/supabase/client')
      const workspaceId = useAuthStore.getState().user?.workspace_id
      if (!workspaceId) return

      const { data } = await supabase
        .from('tours')
        .select('id, code, name')
        .eq('workspace_id', workspaceId)
        // 正式團 = status 非 proposal / template
        .in('status', ['upcoming', 'ongoing', 'returned', 'closed'])
        .or('archived.is.null,archived.eq.false')
        .eq('is_active', true)
        .order('departure_date', { ascending: false })
        .limit(50)

      setTours(data || [])
    }
    loadOfficialTours()
  }, [])

  // 基本表單資料
  const [formData, setFormData] = useState<PaymentFormData>({
    tour_id: '',
    order_id: '',
    receipt_date: getTodayString(),
  })

  // 收款項目列表（不設預設收款方式，使用者自己選）
  const [paymentItems, setPaymentItems] = useState<PaymentItem[]>([
    {
      id: '1',
      receipt_type: '' as unknown as number,
      amount: 0,
      transaction_date: getTodayString(),
    },
  ])

  // 根據選中的團體過濾訂單
  const filteredOrders = useMemo(() => {
    if (!formData.tour_id) return []
    return orders.filter(order => order.tour_id === formData.tour_id)
  }, [orders, formData.tour_id])

  // 選中的訂單
  const selectedOrder = useMemo(() => {
    return orders.find(order => order.id === formData.order_id)
  }, [orders, formData.order_id])

  // 計算總金額
  const totalAmount = useMemo(() => {
    return paymentItems.reduce((sum, item) => sum + (item.amount || 0), 0)
  }, [paymentItems])

  const totalActualAmount = useMemo(() => {
    return paymentItems.reduce((sum, item) => sum + (item.actual_amount || 0), 0)
  }, [paymentItems])

  // 新增收款項目
  const addPaymentItem = useCallback(() => {
    const newItem: PaymentItem = {
      id: Date.now().toString(),
      receipt_type: '' as unknown as number,
      amount: 0,
      transaction_date: getTodayString(),
    }
    setPaymentItems(prev => [...prev, newItem])
  }, [])

  // 移除收款項目
  const removePaymentItem = useCallback((id: string) => {
    setPaymentItems(prev => {
      if (prev.length <= 1) return prev
      return prev.filter(item => item.id !== id)
    })
  }, [])

  // 更新收款項目
  const updatePaymentItem = useCallback((id: string, updates: Partial<PaymentItem>) => {
    setPaymentItems(prev => prev.map(item => (item.id === id ? { ...item, ...updates } : item)))
  }, [])

  // 重置表單
  const resetForm = useCallback(() => {
    setFormData({
      tour_id: '',
      order_id: '',
      receipt_date: getTodayString(),
    })
    setPaymentItems([
      {
        id: '1',
        receipt_type: '' as unknown as number, // 讓使用者自己選
        amount: 0,
        transaction_date: getTodayString(),
      },
    ])
  }, [])

  // 表單驗證
  const validateForm = useCallback(() => {
    const errors: string[] = []

    // 團體收款需要 tour_id 和 order_id
    // 公司收款不需要（允許 NULL）
    if (formData.tour_id && !formData.order_id) {
      errors.push(t('paymentFormSelectOrder'))
    }

    if (paymentItems.length === 0) {
      errors.push(t('paymentFormAtLeastOneItem'))
    }

    if (totalAmount <= 0) {
      errors.push(t('paymentFormTotalGtZero'))
    }

    // 驗證每個收款項目
    paymentItems.forEach((item, index) => {
      if (!item.amount || item.amount <= 0) {
        errors.push(t('paymentFormItemAmountGtZero', { index: index + 1 }))
      }

      if (!item.transaction_date) {
        errors.push(t('paymentFormItemSelectDate', { index: index + 1 }))
      }

      // 4 大類方式都不再有額外必填欄位
    })

    return errors
  }, [formData, paymentItems, totalAmount, t])

  return {
    // 資料
    tours,
    orders,
    formData,
    paymentItems,
    filteredOrders,
    selectedOrder,
    totalAmount,
    totalActualAmount,

    // 操作
    setFormData,
    setPaymentItems,
    addPaymentItem,
    removePaymentItem,
    updatePaymentItem,
    resetForm,
    validateForm,
  }
}
