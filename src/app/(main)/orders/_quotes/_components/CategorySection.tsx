'use client'

import React, { useState } from 'react'
import {
  Users,
  Car,
  Home,
  UtensilsCrossed,
  MapPin,
  MoreHorizontal,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { CostCategory, CostItem } from '../_types'
import { CostItemRow } from './CostItemRow'
import { AccommodationItemRow } from './AccommodationItemRow'


import { useTranslations } from 'next-intl'

const categoryIcons: Record<string, React.ElementType> = {
  transport: Car,
  'group-transport': Users,
  accommodation: Home,
  meals: UtensilsCrossed,
  activities: MapPin,
  others: MoreHorizontal,
  guide: Users,
}

interface CategorySectionProps {
  category: CostCategory
  accommodationTotal: number
  accommodationDays: number
  isReadOnly: boolean
  handleAddAccommodationDay: () => void
  handleAddRow: (categoryId: string, options?: { quantity?: number | null; name?: string }) => void
  handleInsertItem: (categoryId: string, item: CostItem) => void
  handleAddGuideRow: (categoryId: string) => void
  handleAddTransportRow: (categoryId: string) => void
  handleAddAdultTicket: (categoryId: string) => void
  handleAddChildTicket: (categoryId: string) => void
  handleAddInfantTicket: (categoryId: string) => void
  handleAddLunchMeal?: (day?: number) => void
  handleAddDinnerMeal?: (day?: number) => void
  handleAddActivity?: (day?: number) => void
  handleUpdateItem: (
    categoryId: string,
    itemId: string,
    field: keyof CostItem,
    value: unknown
  ) => void
  handleRemoveItem: (categoryId: string, itemId: string) => void
  handleToggleVisibility?: (categoryId: string, itemId: string) => void
  // Local 報價相關
  onOpenLocalPricingDialog?: () => void
}

export const CategorySection: React.FC<CategorySectionProps> = ({
  category,
  accommodationTotal,
  accommodationDays: _accommodationDays,
  isReadOnly,
  handleAddAccommodationDay: _handleAddAccommodationDay,
  handleAddRow,
  handleInsertItem: _handleInsertItem,
  handleAddGuideRow,
  handleAddTransportRow,
  handleAddAdultTicket,
  handleAddChildTicket,
  handleAddInfantTicket,
  handleAddLunchMeal,
  handleAddDinnerMeal: _handleAddDinnerMeal,
  handleAddActivity,
  handleUpdateItem,
  handleRemoveItem,
  handleToggleVisibility,
  onOpenLocalPricingDialog,
}) => {
  const t = useTranslations('orders')
  const Icon = categoryIcons[category.id]

  // 折疊狀態（localStorage 記憶）
  const storageKey = `quote-category-collapsed-${category.id}`
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(storageKey) === '1'
  })
  const toggleCollapsed = () => {
    setIsCollapsed(prev => {
      const next = !prev
      localStorage.setItem(storageKey, next ? '1' : '0')
      return next
    })
  }

  // 拔掉「車資資料庫」按鈕、國家選擇 dialog、RatesDetailDialog 一整套

  return (
    <React.Fragment>
      {/* 分類標題行 - sticky 凍結在表頭下方 */}
      <tr className="bg-[rgba(138,131,122,0.08)] border-b border-morandi-container/60 sticky top-[41px] z-10">
        <td colSpan={2} className="py-3 px-4 text-xs font-medium text-morandi-primary">
          <div className="flex items-center space-x-2">
            {/* 折疊箭頭 */}
            <button
              onClick={toggleCollapsed}
              className="p-0.5 hover:bg-morandi-gold/10 rounded transition-colors"
              title={isCollapsed ? t('quoteCategoryExpand') : t('quoteCategoryCollapse')}
            >
              {isCollapsed ? (
                <ChevronRight size={14} className="text-morandi-primary" />
              ) : (
                <ChevronDown size={14} className="text-morandi-primary" />
              )}
            </button>
            <Icon size={16} className="text-morandi-primary" />
            <span>{category.name}</span>

            {/* 已隱藏項目數量 + 展開恢復 */}
            {category.hiddenItems && category.hiddenItems.length > 0 && (
              <details className="inline">
                <summary className="inline cursor-pointer text-xs text-morandi-secondary hover:text-status-info ml-2">
                  {t('quoteCategoryHiddenPrefix')} {category.hiddenItems.length} {t('quoteCategoryHiddenSuffix')}
                </summary>
                <div className="absolute mt-1 bg-card border border-border rounded-lg shadow-lg p-2 z-10 space-y-1">
                  {category.hiddenItems.map(h => (
                    <button
                      key={h.id}
                      onClick={() => handleToggleVisibility?.(category.id, h.id)}
                      className="block w-full text-left px-2 py-1 text-xs text-status-info hover:bg-status-info/10 rounded"
                    >
                      {h.day
                        ? `D${h.day}${h.sub_category === 'breakfast' ? '早' : h.sub_category === 'lunch' ? '午' : h.sub_category === 'dinner' ? '晚' : ''} `
                        : ''}
                      {h.name} {t('quoteCategoryRestore')}
                    </button>
                  ))}
                </div>
              </details>
            )}

          </div>
        </td>
        <td className="py-3 px-4"></td>
        <td className="py-3 px-4"></td>
        <td className="py-3 px-4"></td>
        <td className="py-3 px-4 text-right">
          {category.id === 'accommodation' ? (
            <Button
              variant="ghost"
              size="xs"
              onClick={() => handleAddRow(category.id)}
              disabled={isReadOnly}
              className={cn(
                'text-morandi-primary hover:bg-morandi-gold/10 h-7 text-xs',
                isReadOnly && 'cursor-not-allowed opacity-60'
              )}
            >
              {t('quoteCategoryAddRoom')}
            </Button>
          ) : category.id === 'group-transport' ? (
            <div className="flex gap-1 justify-end">
              {onOpenLocalPricingDialog && (
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={onOpenLocalPricingDialog}
                  disabled={isReadOnly}
                  className={cn(
                    'text-morandi-primary hover:bg-morandi-gold/10 h-7 text-xs',
                    isReadOnly && 'cursor-not-allowed opacity-60'
                  )}
                >
                  <MapPin size={12} className="mr-0.5" />
                  Local
                </Button>
              )}
              <Button
                variant="ghost"
                size="xs"
                onClick={() => handleAddRow(category.id)}
                disabled={isReadOnly}
                className={cn(
                  'text-morandi-primary hover:bg-morandi-gold/10 h-7 text-xs',
                  isReadOnly && 'cursor-not-allowed opacity-60'
                )}
              >
                {t('quoteCategoryAdd')}
              </Button>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => handleAddTransportRow(category.id)}
                disabled={isReadOnly}
                className={cn(
                  'text-morandi-primary hover:bg-morandi-gold/10 h-7 text-xs',
                  isReadOnly && 'cursor-not-allowed opacity-60'
                )}
              >
                <Car size={12} className="mr-0.5" />
                {t('quoteCategoryTransportLabel')}
              </Button>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => handleAddGuideRow(category.id)}
                disabled={isReadOnly}
                className={cn(
                  'text-morandi-primary hover:bg-morandi-gold/10 h-7 text-xs',
                  isReadOnly && 'cursor-not-allowed opacity-60'
                )}
              >
                <Users size={12} className="mr-0.5" />
                {t('quoteCategoryAdd')}
              </Button>
            </div>
          ) : category.id === 'transport' ? (
            <div className="flex gap-1 justify-end">
              {/* 成人/小孩/嬰兒 各只能新增一次 */}
              {(() => {
                const hasAdult = category.items.some(
                  item => item.name === '成人'
                )
                const hasChild = category.items.some(
                  item => item.name === '兒童'
                )
                const hasInfant = category.items.some(
                  item => item.name === '嬰兒'
                )
                return (
                  <>
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => handleAddAdultTicket(category.id)}
                      disabled={isReadOnly || hasAdult}
                      className={cn(
                        'text-morandi-primary hover:bg-morandi-gold/10 h-7 text-xs',
                        (isReadOnly || hasAdult) && 'cursor-not-allowed opacity-60'
                      )}
                    >
                      {t('quoteCategoryAdult')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => handleAddChildTicket(category.id)}
                      disabled={isReadOnly || hasChild}
                      className={cn(
                        'text-morandi-primary hover:bg-morandi-gold/10 h-7 text-xs',
                        (isReadOnly || hasChild) && 'cursor-not-allowed opacity-60'
                      )}
                    >
                      {t('quoteCategoryChildrenLabel')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => handleAddInfantTicket(category.id)}
                      disabled={isReadOnly || hasInfant}
                      className={cn(
                        'text-morandi-primary hover:bg-morandi-gold/10 h-7 text-xs',
                        (isReadOnly || hasInfant) && 'cursor-not-allowed opacity-60'
                      )}
                    >
                      {t('quoteCategoryInfantLabel')}
                    </Button>
                  </>
                )
              })()}
              <Button
                variant="ghost"
                size="xs"
                onClick={() => handleAddRow(category.id)}
                disabled={isReadOnly}
                className={cn(
                  'text-morandi-primary hover:bg-morandi-gold/10 h-7 text-xs',
                  isReadOnly && 'cursor-not-allowed opacity-60'
                )}
              >
                {t('quoteCategoryOtherLabel')}
              </Button>
            </div>
          ) : category.id === 'meals' && handleAddLunchMeal ? (
            <div className="flex gap-1 justify-end">
              <Button
                variant="ghost"
                size="xs"
                onClick={() => handleAddLunchMeal()}
                disabled={isReadOnly}
                className={cn(
                  'text-morandi-primary hover:bg-morandi-gold/10 h-7 text-xs',
                  isReadOnly && 'cursor-not-allowed opacity-60'
                )}
              >
                {t('quoteCategoryMealsLabel')}
              </Button>
            </div>
          ) : category.id === 'activities' && handleAddActivity ? (
            <div className="flex gap-1 justify-end">
              <Button
                variant="ghost"
                size="xs"
                onClick={() => handleAddActivity()}
                disabled={isReadOnly}
                className={cn(
                  'text-morandi-primary hover:bg-morandi-gold/10 h-7 text-xs',
                  isReadOnly && 'cursor-not-allowed opacity-60'
                )}
              >
                {t('quoteCategoryAdd')}
              </Button>
            </div>
          ) : category.id === 'guide' ? (
            <div className="flex gap-1 justify-end">
              <Button
                variant="ghost"
                size="xs"
                onClick={() => handleAddRow(category.id, { quantity: null, name: '小費' })}
                disabled={isReadOnly}
                className={cn(
                  'text-morandi-primary hover:bg-morandi-gold/10 h-7 text-xs',
                  isReadOnly && 'cursor-not-allowed opacity-60'
                )}
              >
                {t('quoteCategoryTip')}
              </Button>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => handleAddRow(category.id, { quantity: 1, name: '出差費' })}
                disabled={isReadOnly}
                className={cn(
                  'text-morandi-primary hover:bg-morandi-gold/10 h-7 text-xs',
                  isReadOnly && 'cursor-not-allowed opacity-60'
                )}
              >
                {t('quoteCategoryTravelFee')}
              </Button>
            </div>
          ) : (
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="xs"
                onClick={() => handleAddRow(category.id)}
                disabled={isReadOnly}
                className={cn(
                  'text-morandi-primary hover:bg-morandi-gold/10 h-7 text-xs',
                  isReadOnly && 'cursor-not-allowed opacity-60'
                )}
              >
                {t('quoteCategoryAdd')}
              </Button>
            </div>
          )}
        </td>
      </tr>

      {/* 項目明細行 - 折疊時隱藏 */}
      {!isCollapsed &&
        (category.id === 'accommodation'
          ? // 住宿特殊渲染：按天分組，每天內顯示各房型
            (() => {
              const accommodationItems = category.items.filter(item => item.day !== undefined)
              const groupedByDay: Record<number, CostItem[]> = {}

              // 按天分組
              accommodationItems.forEach(item => {
                const day = item.day!
                if (!groupedByDay[day]) groupedByDay[day] = []
                groupedByDay[day].push(item)
              })

              // 找出每天的第一個飯店名稱（用於續住顯示）
              const dayHotelNames: Record<number, string> = {}
              Object.keys(groupedByDay)
                .sort((a, b) => Number(a) - Number(b))
                .forEach(dayStr => {
                  const day = Number(dayStr)
                  const dayItems = groupedByDay[day]
                  // 取第一個非續住的飯店名稱
                  const firstItem = dayItems.find(item => !item.is_same_as_previous)
                  if (firstItem) {
                    dayHotelNames[day] = firstItem.name
                  } else if (day > 1 && dayHotelNames[day - 1]) {
                    // 如果全部都是續住，則用前一天的
                    dayHotelNames[day] = dayHotelNames[day - 1]
                  }
                })

              const sortedDays = Object.keys(groupedByDay).sort((a, b) => Number(a) - Number(b))

              return sortedDays.map((dayStr, dayIndex) => {
                const day = Number(dayStr)
                const dayItems = groupedByDay[day]
                const prevDayHotelName = day > 1 ? dayHotelNames[day - 1] : undefined

                return dayItems.map((item, roomIndex) => (
                  <AccommodationItemRow
                    key={item.id}
                    item={item}
                    categoryId={category.id}
                    day={day}
                    dayIndex={dayIndex}
                    roomIndex={roomIndex}
                    roomCount={dayItems.length}
                    prevDayHotelName={prevDayHotelName}
                    isReadOnly={isReadOnly}
                    handleUpdateItem={handleUpdateItem}
                    handleRemoveItem={handleRemoveItem}
                    handleToggleVisibility={handleToggleVisibility!}
                  />
                ))
              })
            })()
          : // 一般分類的渲染
            category.items.map(item => (
              <CostItemRow
                key={item.id}
                item={item}
                categoryId={category.id}
                handleUpdateItem={handleUpdateItem}
                handleRemoveItem={handleRemoveItem}
                handleToggleVisibility={handleToggleVisibility}
              />
            )))}

      {/* 小計行 - 只有當該分類有項目且未折疊時才顯示 */}
      {!isCollapsed && category.items.length > 0 && (
        <tr className="border-b border-morandi-container/80">
          <td
            colSpan={4}
            className="py-2 px-4 text-right text-sm font-medium text-morandi-secondary"
          >
            {t('quoteCategorySubtotal')}
          </td>
          <td className="py-2 px-4 text-center text-sm font-bold text-morandi-primary">
            {(() => {
              if (category.id === 'accommodation') {
                return accommodationTotal.toLocaleString()
              } else if (category.id === 'transport') {
                // 機票小計：只計算成人
                const adultTicketTotal = category.items
                  .filter(item => item.name === '成人')
                  .reduce((sum, item) => sum + (item.total || 0), 0)
                return adultTicketTotal.toLocaleString()
              } else if (category.id === 'group-transport') {
                // 團體分攤：Local 報價只計算第一個檻次（最便宜的）
                let total = 0
                let hasSeenLocalPricing = false
                for (const item of category.items) {
                  if (item.name?.startsWith('Local 報價')) {
                    // Local 報價：只計算第一個（最小單位檻次）
                    if (!hasSeenLocalPricing) {
                      total += item.total || 0
                      hasSeenLocalPricing = true
                    }
                    // 其他 Local 檻次不計入小計
                  } else {
                    // 非 Local 報價：正常計算
                    total += item.total || 0
                  }
                }
                return total.toLocaleString()
              } else {
                return category.items
                  .reduce((sum, item) => sum + (item.total || 0), 0)
                  .toLocaleString()
              }
            })()}
          </td>
          <td className="py-2 px-4"></td>
        </tr>
      )}

    </React.Fragment>
  )
}
