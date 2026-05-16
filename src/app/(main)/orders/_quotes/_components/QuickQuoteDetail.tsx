'use client'
/**
 * QuickQuoteDetail - 快速報價單詳細頁面
 */

import React, { useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Save, Printer, Edit2, X, Download} from 'lucide-react'
import { ResponsiveHeader } from '@/components/layout/responsive-header'
import { Quote, QuickQuoteItem } from '@/stores/types'
import type { Quote as PrintableQuote } from '@/types/quote.types'
import { PrintableQuickQuote } from './PrintableQuickQuote'
import { useQuickQuoteDetail } from '../_hooks/useQuickQuoteDetail'
import { QuickQuoteHeader, QuickQuoteItemsTable, QuickQuoteSummary } from './quick-quote'
import { useTranslations } from 'next-intl'
import { useTourItineraryItemsByTour } from '@/app/(main)/tours/_hooks/useTourItineraryItems'
import { confirm as confirmDialog } from '@/lib/ui/alert-dialog'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { nanoid } from 'nanoid'
import { useAuthStore } from '@/stores'

import { Spinner } from '@/components/ui/spinner'
const COMPONENT_LABELS = {
  NO_LINKED_TOUR: '此報價單沒有關聯旅遊團',
  NO_ITINERARY_ITEMS: '沒有找到行程項目',
  ALL_ITEMS_EXIST: '所有項目都已存在',
} as const

interface QuickQuoteDetailProps {
  quote: Quote
  onUpdate: (data: Partial<Quote>) => Promise<void> | Promise<Quote>
  viewModeToggle?: React.ReactNode
  /** 嵌入模式：隱藏頂部 header，按鈕移到底部 */
  embedded?: boolean
  /** Portal 目標：actions 透過 React Portal 渲染到此容器（讓 actions 跟版本 tabs 同列） */
  actionsContainer?: HTMLElement | null
}

export const QuickQuoteDetail: React.FC<QuickQuoteDetailProps> = ({
  quote,
  onUpdate,
  viewModeToggle,
  embedded = false,
  actionsContainer,
}) => {
  const t = useTranslations('orders')
  const router = useRouter()
  const { user: _user } = useAuthStore()

  // 使用自定義 hook 管理所有狀態和邏輯
  const {
    isEditing,
    setIsEditing,
    isSaving,
    showPrintPreview,
    setShowPrintPreview,
    formData,
    setFormField,
    items,
    setItems,
    totalAmount,
    totalCost,
    totalProfit,
    balanceAmount,
    addItem,
    removeItem,
    updateItem,
    reorderItems,
    handleSave,
  } = useQuickQuoteDetail({ quote, onUpdate })

  // 核心表項目（SWR 共享 cache；tour_id 為 null 時不 fetch）
  const { items: tourItems, loading: isLoadingItems } = useTourItineraryItemsByTour(
    quote.tour_id || null
  )

  // 從行程載入項目（成本 fallback：confirmed → quoted → estimated → 0）
  const handleLoadFromTour = useCallback(() => {
    if (!quote.tour_id) {
      toast.error(COMPONENT_LABELS.NO_LINKED_TOUR)
      return
    }
    if (!tourItems || tourItems.length === 0) {
      toast.info(COMPONENT_LABELS.NO_ITINERARY_ITEMS)
      return
    }

    const newItems: QuickQuoteItem[] = tourItems.map(item => ({
      id: nanoid(),
      description: `Day${item.day_number ?? '?'} ${item.category}: ${item.title || item.resource_name || ''}`,
      cost: item.confirmed_cost ?? item.quoted_cost ?? item.estimated_cost ?? 0,
      unit_price: 0,
      quantity: item.quantity || 1,
      amount: 0,
      notes: '',
    }))

    const existingDescriptions = new Set(items.map(i => i.description))
    const itemsToAdd = newItems.filter(i => !existingDescriptions.has(i.description))

    if (itemsToAdd.length === 0) {
      toast.info(COMPONENT_LABELS.ALL_ITEMS_EXIST)
    } else {
      setItems(prev => [...prev, ...itemsToAdd])
      setIsEditing(true)
      toast.success(`已載入 ${itemsToAdd.length} 個項目`)
    }
  }, [quote.tour_id, tourItems, items, setItems, setIsEditing])

  // 返回（編輯中先 confirm）
  const handleBack = useCallback(async () => {
    if (isEditing) {
      const ok = await confirmDialog('尚未儲存，確定離開？目前的編輯內容將會遺失。', {
        type: 'warning',
        confirmText: '離開',
        cancelText: '繼續編輯',
      })
      if (!ok) return
    }
    if (quote.tour_code) {
      router.push(`/tours/${quote.tour_code}?tab=quick-quote`)
    } else {
      router.push('/tours') // 無團號時導去團列表、/quotes 已廢棄
    }
  }, [isEditing, quote.tour_code, router])

  // 列印
  const handlePrint = async () => {
    window.print()
    setShowPrintPreview(false)
  }

  // 操作按鈕（在 header 或底部使用）
  const ActionButtons = () => (
    <div className="flex items-center gap-2">
      {viewModeToggle}

      {/* 列印按鈕（任何模式都顯示） */}
      <Button onClick={() => setShowPrintPreview(true)} variant="soft-gold" className="gap-2">
        <Printer className="h-4 w-4" />
        {t('quoteDetailPrint')}
      </Button>

      {/* 非編輯模式 */}
      {!isEditing && (
        <Button onClick={() => setIsEditing(true)} variant="soft-gold" className="gap-2">
          <Edit2 size={16} />
          {t('quoteDetailEdit')}
        </Button>
      )}

      {/* 編輯模式 */}
      {isEditing && (
        <>
          {quote.tour_id && (
            <Button
              onClick={handleLoadFromTour}
              variant="soft-gold"
              className="gap-2"
              disabled={isLoadingItems}
            >
              {isLoadingItems ? (
                <Spinner size="md" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {t('quoteDetailLoadItinerary')}
            </Button>
          )}
          <Button onClick={() => setIsEditing(false)} variant="soft-gold" className="gap-2">
            <X size={16} />
            {t('quoteDetailCancel')}
          </Button>
          <Button variant="soft-gold"
            onClick={() => handleSave(true)}
            disabled={isSaving}
 className="gap-2"
          >
            <Save className="h-4 w-4" />
            {isSaving ? t('quoteDetailSavingLabel') : t('quoteDetailSave')}
          </Button>
        </>
      )}
    </div>
  )

  return (
    <>
      {/* 非嵌入模式才顯示 header */}
      {!embedded && (
        <ResponsiveHeader
          title={`快速報價單 ${quote.code || ''}`}
          showBackButton={true}
          onBack={handleBack}
          actions={<ActionButtons />}
        />
      )}

      {/* 嵌入模式：actions 透過 Portal 傳到 tour-quote-tab 的版本 tabs row 右側 */}
      {embedded && actionsContainer && createPortal(<ActionButtons />, actionsContainer)}

      <div
        className={cn(
          'w-full overflow-x-auto',
          embedded ? 'pb-6' : 'p-3 space-y-4'
        )}
      >
        {/* 嵌入模式：3 個 section 合進一張大卡、不畫 section divider */}
        {embedded ? (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <QuickQuoteHeader
              formData={formData}
              isEditing={isEditing}
              onFieldChange={setFormField}
              embedded
            />
            <QuickQuoteItemsTable
              items={items}
              isEditing={isEditing}
              embedded
              onAddItem={addItem}
              onRemoveItem={removeItem}
              onUpdateItem={updateItem}
              onReorderItems={reorderItems}
            />
            <QuickQuoteSummary
              totalCost={totalCost}
              totalAmount={totalAmount}
              totalProfit={totalProfit}
              receivedAmount={formData.received_amount}
              balanceAmount={balanceAmount}
              isEditing={isEditing}
              expenseDescription={formData.expense_description}
              embedded
              onReceivedAmountChange={value => setFormField('received_amount', value)}
              onExpenseDescriptionChange={value => setFormField('expense_description', value)}
            />
          </div>
        ) : (
          <>
            <QuickQuoteHeader
              formData={formData}
              isEditing={isEditing}
              onFieldChange={setFormField}
            />
            <QuickQuoteItemsTable
              items={items}
              isEditing={isEditing}
              onAddItem={addItem}
              onRemoveItem={removeItem}
              onUpdateItem={updateItem}
              onReorderItems={reorderItems}
            />
            <QuickQuoteSummary
              totalCost={totalCost}
              totalAmount={totalAmount}
              totalProfit={totalProfit}
              receivedAmount={formData.received_amount}
              balanceAmount={balanceAmount}
              isEditing={isEditing}
              expenseDescription={formData.expense_description}
              onReceivedAmountChange={value => setFormField('received_amount', value)}
              onExpenseDescriptionChange={value => setFormField('expense_description', value)}
            />
          </>
        )}

        {/* 列印預覽對話框 */}
        <PrintableQuickQuote
          quote={
            {
              ...quote,
              ...formData,
            } as unknown as PrintableQuote
          }
          items={items}
          isOpen={showPrintPreview}
          onClose={() => setShowPrintPreview(false)}
          onPrint={handlePrint}
        />
      </div>
    </>
  )
}
