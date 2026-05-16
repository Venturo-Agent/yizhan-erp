'use client'

/**
 * QuoteCostTable
 * 報價單成本計算表格（含水平滾動）
 */

import React, { useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { CostCategory } from '@/app/(main)/orders/_quotes/_types'
import { CategorySection } from '@/app/(main)/orders/_quotes/_components'
import { useCategoryOperations } from '@/app/(main)/orders/_quotes/_hooks/useCategoryOperations'
import { useTranslations } from 'next-intl'

interface QuoteCostTableProps {
  categories: CostCategory[]
  accommodationTotal: number
  accommodationDays: number
  isReadOnly: boolean
  categoryOps: ReturnType<typeof useCategoryOperations>
  onToggleVisibility: (categoryId: string, itemId: string) => void
  onOpenLocalPricingDialog: () => void
}

export function QuoteCostTable({
  categories,
  accommodationTotal,
  accommodationDays,
  isReadOnly,
  categoryOps,
  onToggleVisibility,
  onOpenLocalPricingDialog,
}: QuoteCostTableProps) {
  const t = useTranslations('orders')
  const scrollRef = useRef<HTMLDivElement>(null)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  // scroll 時短暫加 class（供 CSS 過渡用）
  useEffect(() => {
    const handleScroll = () => {
      if (scrollRef.current) {
        scrollRef.current.classList.add('scrolling')
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current)
        }
        scrollTimeoutRef.current = setTimeout(() => {
          if (scrollRef.current) {
            scrollRef.current.classList.remove('scrolling')
          }
        }, 1000)
      }
    }

    const element = scrollRef.current
    if (element) {
      element.addEventListener('scroll', handleScroll)
      return () => element.removeEventListener('scroll', handleScroll)
    }
  }, [])

  return (
    <div className={cn('w-full', isReadOnly && 'opacity-70 pointer-events-none select-none')}>
      <div className="border border-border bg-card rounded-xl shadow-sm overflow-hidden">
        <div ref={scrollRef} className="overflow-x-auto">
          <table className="w-full min-w-[800px] border-collapse table-fixed">
            <colgroup>
              <col style={{ width: '100px' }} />
              <col style={{ width: '40%' }} />
              <col style={{ width: '80px' }} />
              <col style={{ width: '112px' }} />
              <col style={{ width: '112px' }} />
              <col />
            </colgroup>
            <thead className="bg-card border-b border-border sticky top-0 z-20 [&_tr]:bg-morandi-gold-header">
              <tr>
                <th
                  className="text-center py-3 px-4 text-xs font-medium text-morandi-primary table-divider"
                  style={{ whiteSpace: 'nowrap', wordBreak: 'keep-all' }}
                >
                  {t('quoteDetailEmbedCategory')}
                </th>
                <th className="text-center py-3 px-4 text-xs font-medium text-morandi-primary table-divider">
                  {t('quoteDetailEmbedItem')}
                </th>
                <th className="text-center py-3 px-4 text-xs font-medium text-morandi-primary table-divider whitespace-nowrap">
                  {t('quoteDetailEmbedQuantity')}
                </th>
                <th className="text-center py-3 px-4 text-xs font-medium text-morandi-primary table-divider whitespace-nowrap">
                  {t('quoteDetailEmbedUnitPrice')}
                </th>
                <th className="text-center py-3 px-4 text-xs font-medium text-morandi-primary table-divider whitespace-nowrap">
                  {t('quoteDetailEmbedSubtotal')}
                </th>
                <th className="text-center py-3 px-4 text-xs font-medium text-morandi-primary whitespace-nowrap">
                  {t('quoteDetailEmbedActions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {categories.map(category => (
                <CategorySection
                  key={category.id}
                  category={category}
                  accommodationTotal={accommodationTotal}
                  accommodationDays={accommodationDays}
                  isReadOnly={isReadOnly}
                  handleAddAccommodationDay={categoryOps.handleAddAccommodationDay}
                  handleAddRow={categoryOps.handleAddRow}
                  handleInsertItem={categoryOps.handleInsertItem}
                  handleAddGuideRow={categoryOps.handleAddGuideRow}
                  handleAddTransportRow={categoryOps.handleAddTransportRow}
                  handleAddAdultTicket={categoryOps.handleAddAdultTicket}
                  handleAddChildTicket={categoryOps.handleAddChildTicket}
                  handleAddInfantTicket={categoryOps.handleAddInfantTicket}
                  handleAddLunchMeal={categoryOps.handleAddLunchMeal}
                  handleAddDinnerMeal={categoryOps.handleAddDinnerMeal}
                  handleAddActivity={categoryOps.handleAddActivity}
                  handleUpdateItem={categoryOps.handleUpdateItem}
                  handleRemoveItem={categoryOps.handleRemoveItem}
                  handleToggleVisibility={onToggleVisibility}
                  onOpenLocalPricingDialog={
                    category.id === 'group-transport' ? onOpenLocalPricingDialog : undefined
                  }
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
