'use client'

import { useCallback } from 'react'
import { CostItem, CostCategory } from '../_types'

interface UseActivityOperationsProps {
  categories: CostCategory[]
  setCategories: React.Dispatch<React.SetStateAction<CostCategory[]>>
}

export const useActivityOperations = ({
  categories,
  setCategories,
}: UseActivityOperationsProps) => {
  // 計算活動的下一個天數
  const getNextActivityDay = useCallback(() => {
    const activitiesCategory = categories.find(cat => cat.id === 'activities')
    if (!activitiesCategory || activitiesCategory.items.length === 0) return 1

    // 找出最大的天數
    const maxDay = activitiesCategory.items.reduce((max, item) => {
      const match = item.name.match(/Day\s*(\d+)/)
      if (match) {
        return Math.max(max, parseInt(match[1]))
      }
      return max
    }, 0)

    return maxDay > 0 ? maxDay : 1
  }, [categories])

  // 新增活動（帶日期）
  const handleAddActivity = useCallback(
    (day?: number) => {
      const actualDay = day ?? getNextActivityDay()
      const newItem: CostItem = {
        id: Date.now().toString(),
        name: '', // 空白，讓使用者自己輸入
        quantity: 1,
        unit_price: null,
        total: 0,
        note: '',
        day: actualDay, // 記錄日期
      }

      setCategories(prev =>
        prev.map(cat => {
          if (cat.id === 'activities') {
            return {
              ...cat,
              items: [...cat.items, newItem],
            }
          }
          return cat
        })
      )
    },
    [setCategories, getNextActivityDay]
  )

  return {
    handleAddActivity,
  }
}
