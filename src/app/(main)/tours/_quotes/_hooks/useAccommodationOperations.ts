'use client'

import { useCallback } from 'react'
import { CostItem, CostCategory } from '../_types'

interface UseAccommodationOperationsProps {
  categories: CostCategory[]
  setCategories: React.Dispatch<React.SetStateAction<CostCategory[]>>
  accommodationDays: number
  setAccommodationDays: (days: number) => void
}

export const useAccommodationOperations = ({
  categories,
  setCategories,
  accommodationDays,
  setAccommodationDays,
}: UseAccommodationOperationsProps) => {
  // 住宿：新增房型（在所有現有天數都新增同樣的房型）
  const handleAddAccommodationRoomType = useCallback(() => {
    // 從現有住宿項目算出有哪些天
    const accCat = categories.find(c => c.id === 'accommodation')
    const existingDays = new Set(accCat?.items.map(i => i.day).filter(Boolean) as number[])
    if (existingDays.size === 0) return

    const timestamp = Date.now()
    const newItems: CostItem[] = []

    for (const day of existingDays) {
      newItems.push({
        id: `accommodation-day${day}-${timestamp}`,
        name: '',
        quantity: 2, // 預設 2 人房
        unit_price: null,
        total: 0,
        note: '',
        day,
        room_type: '',
      })
    }

    setCategories(prev =>
      prev.map(cat => {
        if (cat.id === 'accommodation') {
          return {
            ...cat,
            items: [...cat.items, ...newItems],
          }
        }
        return cat
      })
    )
  }, [categories, setCategories])

  // 住宿：新增天數（只新增住宿，不自動帶入餐食）
  const handleAddAccommodationDay = useCallback(() => {
    const newDayCount = accommodationDays + 1
    setAccommodationDays(newDayCount)

    // 新增一天，預設加一個空房型
    const timestamp = Date.now()
    const newAccommodationItem: CostItem = {
      id: `accommodation-day${newDayCount}-${timestamp}`,
      name: '',
      quantity: 2, // 預設 2 人房
      unit_price: null,
      total: 0,
      note: '',
      day: newDayCount,
      room_type: '',
    }

    setCategories(prev =>
      prev.map(cat => {
        if (cat.id === 'accommodation') {
          return {
            ...cat,
            items: [...cat.items, newAccommodationItem],
          }
        }
        return cat
      })
    )
  }, [accommodationDays, setAccommodationDays, setCategories])

  return {
    handleAddAccommodationRoomType,
    handleAddAccommodationDay,
  }
}
