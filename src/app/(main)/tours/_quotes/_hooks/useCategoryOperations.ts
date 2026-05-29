'use client'

import { useCallback } from 'react'
import { CostCategory } from '../_types'
import { useCategoryItems } from './useCategoryItems'
import { useAccommodationOperations } from './useAccommodationOperations'
import { useMealOperations } from './useMealOperations'
import { useActivityOperations } from './useActivityOperations'
import { useTransportOperations } from './useTransportOperations'

interface UseCategoryOperationsProps {
  categories: CostCategory[]
  setCategories: React.Dispatch<React.SetStateAction<CostCategory[]>>
  accommodationDays: number
  setAccommodationDays: (days: number) => void
  groupSize: number
  groupSizeForGuide: number
}

export const useCategoryOperations = ({
  categories,
  setCategories,
  accommodationDays,
  setAccommodationDays,
  groupSize,
  groupSizeForGuide,
}: UseCategoryOperationsProps) => {
  // 使用 Transport Operations hook
  const {
    calculateGuideWithCategories,
    updateGuideItems,
    handleAddGuideRow,
    handleAddTransportRow,
    handleAddAdultTicket,
    handleAddChildTicket,
    handleAddInfantTicket,
  } = useTransportOperations({
    categories,
    setCategories,
    groupSizeForGuide,
  })

  // 使用 Category Items hook
  const { handleInsertItem, handleUpdateItem, handleRemoveItem } = useCategoryItems({
    categories,
    setCategories,
    accommodationDays,
    setAccommodationDays,
    groupSize,
    groupSizeForGuide,
    updateGuideItems,
  })

  // 使用 Accommodation Operations hook
  const { handleAddAccommodationRoomType, handleAddAccommodationDay } = useAccommodationOperations({
    categories,
    setCategories,
    accommodationDays,
    setAccommodationDays,
  })

  // 使用 Meal Operations hook
  const { handleAddLunchMeal, handleAddDinnerMeal } = useMealOperations({
    categories,
    setCategories,
  })

  // 使用 Activity Operations hook
  const { handleAddActivity } = useActivityOperations({
    categories,
    setCategories,
  })

  // 一般新增項目（包含住宿特殊處理）
  const handleAddRow = useCallback(
    (category_id: string, options?: { quantity?: number | null; name?: string }) => {
      if (category_id === 'accommodation') {
        // 住宿用專用函數
        handleAddAccommodationRoomType()
        return
      }

      const newItem = {
        id: Date.now().toString(),
        name: options?.name ?? '',
        quantity: options?.quantity ?? null,
        unit_price: null,
        total: 0,
        note: '',
        ...(category_id === 'guide' && {
          is_group_cost: !!(options?.quantity && options.quantity > 0),
        }),
      }

      setCategories(prev =>
        prev.map(cat => {
          if (cat.id === category_id) {
            return {
              ...cat,
              items: [...cat.items, newItem],
            }
          }
          return cat
        })
      )
    },
    [handleAddAccommodationRoomType, setCategories]
  )

  return {
    handleAddRow,
    handleInsertItem,
    handleAddGuideRow,
    handleAddTransportRow,
    handleAddAdultTicket,
    handleAddChildTicket,
    handleAddInfantTicket,
    handleAddLunchMeal,
    handleAddDinnerMeal,
    handleAddActivity,
    handleAddAccommodationDay,
    handleAddAccommodationRoomType,
    handleUpdateItem,
    handleRemoveItem,
    calculateGuideWithCategories,
    updateGuideItems,
  }
}
