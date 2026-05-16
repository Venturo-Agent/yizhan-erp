'use client'

import React from 'react'
import { useTranslations } from 'next-intl'
import { CostItem } from '../_types'
import { CalcInput } from '@/components/ui/calc-input'
import { cn } from '@/lib/utils'
import { EyeOff } from 'lucide-react'

interface AccommodationItemRowProps {
  item: CostItem
  categoryId: string
  day: number
  dayIndex: number
  roomIndex: number
  roomCount: number
  prevDayHotelName?: string // 前一天的飯店名稱（用於續住顯示）
  isReadOnly?: boolean
  handleUpdateItem: (
    categoryId: string,
    itemId: string,
    field: keyof CostItem,
    value: unknown
  ) => void
  handleRemoveItem: (categoryId: string, itemId: string) => void
  handleToggleVisibility: (categoryId: string, itemId: string) => void
}

export const AccommodationItemRow: React.FC<AccommodationItemRowProps> = ({
  item,
  categoryId,
  day,
  dayIndex: _dayIndex,
  roomIndex,
  roomCount,
  prevDayHotelName,
  isReadOnly,
  handleUpdateItem,
  handleRemoveItem,
  handleToggleVisibility,
}) => {
  const t = useTranslations('orders')
  // 簡潔輸入框樣式（右側多留空間避免被 table-divider 遮到）
  const inputClass = 'input-no-focus w-full pl-1 pr-3 py-1 text-sm bg-transparent'

  // 是否為續住（只有第一個房型才顯示續住選項）
  const isSameAsPrevious = item.is_same_as_previous || false
  const _canShowSameAsPrevious = roomIndex === 0 && day > 1 && prevDayHotelName

  return (
    <tr
      className={cn(
        'border-b border-morandi-container/60 hover:bg-morandi-container/20 transition-colors'
      )}
    >
      {/* 分類欄：第一個房型顯示天數，合併儲存格 */}
      {roomIndex === 0 && (
        <td
          className="py-3 px-4 text-sm text-morandi-primary text-center table-divider"
          rowSpan={roomCount}
        >
          DAY{day}
        </td>
      )}

      {/* 項目欄：房型名稱（續住時顯示提示） */}
      <td className="py-3 px-4 text-sm text-morandi-primary text-center table-divider">
        {isSameAsPrevious ? (
          <span className="text-morandi-secondary italic">
            {t('quoteAccommodationContinueStayPrefix')}
            {prevDayHotelName})
          </span>
        ) : (
          <input
            type="text"
            value={item.name}
            onChange={e => handleUpdateItem(categoryId, item.id, 'name', e.target.value)}
            className={`${inputClass} text-center`}
            placeholder={t('quoteAccommodationRoomName')}
            disabled={isReadOnly}
          />
        )}
      </td>

      {/* 人數欄 */}
      <td className="py-3 px-4 text-sm text-morandi-secondary text-center table-divider">
        <CalcInput
          value={item.quantity}
          onChange={val => handleUpdateItem(categoryId, item.id, 'quantity', val)}
          formula={item.quantity_formula}
          onFormulaChange={f => handleUpdateItem(categoryId, item.id, 'quantity_formula', f)}
          className={`${inputClass} text-center`}
          placeholder={t('quoteAccommodationPeople')}
          disabled={isReadOnly}
        />
      </td>

      {/* 單價欄 */}
      <td className="py-3 px-4 text-sm text-morandi-secondary text-center table-divider">
        <CalcInput
          value={item.unit_price}
          onChange={val => handleUpdateItem(categoryId, item.id, 'unit_price', val)}
          formula={item.unit_price_formula}
          onFormulaChange={f => handleUpdateItem(categoryId, item.id, 'unit_price_formula', f)}
          className={`${inputClass} text-center`}
          placeholder={t('quoteAccommodationUnitPrice')}
          disabled={isReadOnly}
        />
      </td>

      {/* 小計欄 */}
      <td className="py-3 px-4 text-sm text-morandi-primary text-center font-medium table-divider whitespace-nowrap">
        {item.total.toLocaleString()}
      </td>

      {/* 操作欄（1 欄對齊表頭 6 欄） */}
      <td className="py-3 px-4 text-sm text-morandi-secondary">
        <div className="flex items-center justify-between gap-2">
          <input
            type="text"
            value={isSameAsPrevious ? t('quoteAccommodationContinueStay') : item.note || ''}
            onChange={e => handleUpdateItem(categoryId, item.id, 'note', e.target.value)}
            className={`${inputClass} flex-1 min-w-0 ${item.note?.startsWith('⚠️') ? 'text-morandi-gold font-medium' : ''}`}
            placeholder={t('quoteAccommodationRemarks')}
            disabled={isReadOnly || isSameAsPrevious}
            title={item.note || undefined}
          />
          <div className="flex items-center gap-1 ml-2 flex-shrink-0">
            {!isReadOnly && (
              <>
                {/* 隱藏/顯示按鈕 */}
                <button
                  onClick={() => handleToggleVisibility(categoryId, item.id)}
                  className="w-4 h-4 flex items-center justify-center text-morandi-secondary hover:text-morandi-gold hover:bg-morandi-gold/10 rounded transition-all"
                  title={t('quoteAccommodationHideFromQuote')}
                >
                  <EyeOff size={14} />
                </button>
                {/* 刪除按鈕（只有非第一個房型才顯示） */}
                {roomIndex !== 0 && (
                  <button
                    onClick={() => handleRemoveItem(categoryId, item.id)}
                    className="w-4 h-4 flex items-center justify-center text-xs text-morandi-secondary hover:text-morandi-red hover:bg-morandi-red/10 rounded transition-all"
                    title={t('quoteAccommodationDelete')}
                  >
                    ×
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </td>
    </tr>
  )
}
