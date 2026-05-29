'use client'

import { getTodayString } from '@/lib/utils/format-date'

import { logger } from '@/lib/utils/logger'
import { useState, useEffect } from 'react'
import { nanoid } from 'nanoid'
import { Quote, QuickQuoteItem } from '@/stores/types'
import { alert } from '@/lib/ui/alert-dialog'

interface UseQuickQuoteDetailProps {
  quote: Quote
  onUpdate: (data: Partial<Quote>) => Promise<void> | Promise<Quote>
}

interface FormData {
  customer_name: string
  contact_phone: string
  contact_address: string
  tour_code: string
  handler_name: string
  issue_date: string
  received_amount: number
  expense_description: string
}

export function useQuickQuoteDetail({ quote, onUpdate }: UseQuickQuoteDetailProps) {
  // 狀態管理 - 草稿狀態自動進入編輯模式
  const [isEditing, setIsEditing] = useState(quote.status === 'draft')
  const [isSaving, setIsSaving] = useState(false)
  const [showPrintPreview, setShowPrintPreview] = useState(false)

  // 表單狀態
  const [formData, setFormData] = useState<FormData>({
    customer_name: quote.customer_name || '',
    contact_phone: quote.contact_phone || '',
    contact_address: quote.contact_address || '',
    tour_code: quote.tour_code || '',
    handler_name: quote.handler_name || 'William',
    issue_date: quote.issue_date || getTodayString(),
    received_amount: quote.received_amount || 0,
    expense_description: quote.expense_description || '',
  })

  // 項目管理
  const [items, setItems] = useState<QuickQuoteItem[]>([])
  const [isLoadingItems, setIsLoadingItems] = useState(true)

  useEffect(() => {
    if (quote.quick_quote_items && Array.isArray(quote.quick_quote_items)) {
      setItems(quote.quick_quote_items)
    } else {
      setItems([])
    }
    setIsLoadingItems(false)
  }, [quote.quick_quote_items])

  const setFormField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // 計算金額
  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0)
  const totalCost = items.reduce((sum, item) => sum + (item.cost || 0) * item.quantity, 0)
  const totalProfit = totalAmount - totalCost
  const balanceAmount = totalAmount - formData.received_amount

  // 項目操作
  const addItem = () => {
    const newItem: QuickQuoteItem = {
      id: nanoid(),
      description: '',
      quantity: 1,
      unit_price: 0,
      amount: 0,
      notes: '',
    }
    setItems(prev => [...prev, newItem])
    setIsEditing(true)
  }

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id))
  }

  const updateItem = <K extends keyof QuickQuoteItem>(
    id: string,
    field: K,
    value: QuickQuoteItem[K]
  ) => {
    setItems(prev =>
      prev.map(item => {
        if (item.id !== id) return item
        const u = { ...item, [field]: value }
        if (field === 'quantity' || field === 'unit_price') {
          u.amount = u.quantity * u.unit_price
        }
        return u
      })
    )
  }

  // 重新排序項目
  const reorderItems = (oldIndex: number, newIndex: number) => {
    setItems(prev => {
      const newItems = [...prev]
      const [removed] = newItems.splice(oldIndex, 1)
      newItems.splice(newIndex, 0, removed)
      return newItems
    })
  }

  // 儲存變更 - 直接存到主欄位
  const handleSave = async (showAlert = false) => {
    setIsSaving(true)
    try {
      await onUpdate({
        customer_name: formData.customer_name,
        contact_phone: formData.contact_phone,
        contact_address: formData.contact_address,
        tour_code: formData.tour_code,
        handler_name: formData.handler_name,
        issue_date: formData.issue_date,
        expense_description: formData.expense_description,
        total_amount: totalAmount,
        total_cost: totalCost,
        received_amount: formData.received_amount,
        balance_amount: totalAmount - formData.received_amount,
        quick_quote_items: items,
      })

      logger.log('✅ [QuickQuote] 儲存成功')
      if (showAlert) {
        setIsEditing(false)
      }
    } catch (error) {
      logger.error('❌ [QuickQuote] 儲存失敗:', error)
      if (showAlert) {
        await alert('儲存失敗：' + (error as Error).message, 'error')
      }
    } finally {
      setIsSaving(false)
    }
  }

  return {
    // 狀態
    isEditing,
    setIsEditing,
    isSaving,
    showPrintPreview,
    setShowPrintPreview,

    // 表單資料
    formData,
    setFormField,

    // 項目資料
    items,
    setItems,
    isLoadingItems,

    // 計算結果
    totalAmount,
    totalCost,
    totalProfit,
    balanceAmount,

    // 操作方法
    addItem,
    removeItem,
    updateItem,
    reorderItems,
    handleSave,
  }
}
