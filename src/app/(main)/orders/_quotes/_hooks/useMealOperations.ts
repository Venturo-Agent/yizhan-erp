'use client'

import { useCallback } from 'react'
import { CostItem, CostCategory } from '../_types'

interface UseMealOperationsProps {
  categories: CostCategory[]
  setCategories: React.Dispatch<React.SetStateAction<CostCategory[]>>
}

export const useMealOperations = ({ setCategories }: UseMealOperationsProps) => {
  // 新增餐飲項目（簡化版：不自動加 Day X 前綴）
  const handleAddLunchMeal = useCallback(() => {
    const newItem: CostItem = {
      id: Date.now().toString(),
      name: '', // 空白，讓用戶自己填寫
      quantity: 1,
      unit_price: null,
      total: 0,
      note: '',
    }

    setCategories(prev =>
      prev.map(cat => {
        if (cat.id === 'meals') {
          return {
            ...cat,
            items: [...cat.items, newItem],
          }
        }
        return cat
      })
    )
  }, [setCategories])

  // 保留 handleAddDinnerMeal 以維持 API 相容性
  const handleAddDinnerMeal = useCallback(() => {
    handleAddLunchMeal()
  }, [handleAddLunchMeal])

  return {
    handleAddLunchMeal,
    handleAddDinnerMeal,
  }
}
