'use client'

import { useCallback } from 'react'
import { CostItem, CostCategory } from '../_types'

interface UseCategoryItemsProps {
  categories: CostCategory[]
  setCategories: React.Dispatch<React.SetStateAction<CostCategory[]>>
  accommodationDays: number
  setAccommodationDays: (days: number) => void
  groupSize: number
  groupSizeForGuide: number
  updateGuideItems: (categories: CostCategory[]) => CostCategory[]
}

export const useCategoryItems = ({
  categories: _categories,
  setCategories,
  accommodationDays: _accommodationDays,
  setAccommodationDays,
  groupSize,
  groupSizeForGuide,
  updateGuideItems,
}: UseCategoryItemsProps) => {
  // 插入完整的項目（用於從車資管理插入）
  const handleInsertItem = useCallback(
    (category_id: string, item: CostItem) => {
      setCategories(prev =>
        prev.map(cat => {
          if (cat.id === category_id) {
            return {
              ...cat,
              items: [...cat.items, item],
            }
          }
          return cat
        })
      )
    },
    [setCategories]
  )

  const handleUpdateItem = useCallback(
    (category_id: string, itemId: string, field: keyof CostItem, value: unknown) => {
      setCategories(prev => {
        const newCategories = prev.map(cat => {
          if (cat.id === category_id) {
            const updatedItems = cat.items.map(item => {
              if (item.id === itemId) {
                const updatedItem = { ...item, [field]: value }

                // 餐飲自理：勾選時自動清除價格
                if (field === 'is_self_arranged' && value === true) {
                  updatedItem.unit_price = 0
                  updatedItem.total = 0
                  return updatedItem
                }

                // 自動計算總價
                if (
                  field === 'quantity' ||
                  field === 'unit_price' ||
                  field === 'is_group_cost' ||
                  field === 'adult_price' ||
                  field === 'child_price' ||
                  field === 'infant_price'
                ) {
                  // 數量預設為 1，只有當用戶輸入時才使用輸入值
                  const effectiveQuantity =
                    updatedItem.quantity === 0 ? 1 : updatedItem.quantity || 1

                  // 成人、兒童、嬰兒：顯示對應票價在小計欄位
                  if (updatedItem.name === '成人') {
                    updatedItem.total = updatedItem.adult_price || 0
                  } else if (updatedItem.name === '兒童') {
                    updatedItem.total = updatedItem.child_price || 0
                  } else if (updatedItem.name === '嬰兒') {
                    updatedItem.total = updatedItem.infant_price || 0
                  } else if (
                    category_id === 'accommodation' ||
                    category_id === 'meals' ||
                    category_id === 'activities'
                  ) {
                    // 住宿 & 餐飲 & 活動：小計 = 單價 ÷ 單位人數
                    // 住宿：quantity = 幾人房（2人房 → 房價 ÷ 2 = 每人價）
                    // 餐飲：quantity = 幾人一桌（10人桌 → 桌價 ÷ 10 = 每人價）
                    // 活動：quantity = 幾人分攤（團體導覽 4000 ÷ 20人 = 200/人）
                    // 不填 quantity 預設 1（個人門票 / 個人餐 / 單人房）
                    updatedItem.total =
                      effectiveQuantity > 0
                        ? Math.ceil((updatedItem.unit_price || 0) / effectiveQuantity)
                        : 0
                  } else if (category_id === 'guide') {
                    // 領隊導遊分類：
                    // - is_group_cost = true（出差費）→ total = (數量 × 單價) ÷ 人數
                    // - is_group_cost = false（小費）→ total = 數量 × 單價（每人費用，不除人數）
                    if (updatedItem.is_group_cost && groupSizeForGuide > 1) {
                      // 團體分攤（出差費）：整筆費用除以人數
                      const total_cost = effectiveQuantity * (updatedItem.unit_price || 0)
                      updatedItem.total = Math.ceil(total_cost / groupSizeForGuide)
                    } else {
                      // 個人費用（小費）：數量 × 單價，不除人數
                      updatedItem.total = Math.ceil(
                        effectiveQuantity * (updatedItem.unit_price || 0)
                      )
                    }
                  } else if (
                    category_id === 'transport' &&
                    updatedItem.is_group_cost &&
                    groupSize > 1
                  ) {
                    // 交通的團體分攤邏輯：小計 = (數量 × 單價) ÷ 團體人數
                    const total_cost = effectiveQuantity * (updatedItem.unit_price || 0)
                    updatedItem.total = Math.ceil(total_cost / groupSize)
                  } else if (category_id === 'group-transport') {
                    // 團體分攤分類：自動執行團體分攤邏輯
                    if (updatedItem.name === '領隊分攤') {
                      // 領隊分攤：(單價 × 數量) ÷ 人數（不含嬰兒）
                      const guideTotalCost = (updatedItem.unit_price || 0) * effectiveQuantity
                      updatedItem.total =
                        groupSizeForGuide > 0 ? Math.ceil(guideTotalCost / groupSizeForGuide) : 0
                    } else if (groupSizeForGuide > 1) {
                      // 其他團體分攤項目：執行一般團體分攤邏輯（不含嬰兒）
                      const total_cost = effectiveQuantity * (updatedItem.unit_price || 0)
                      updatedItem.total = Math.ceil(total_cost / groupSizeForGuide)
                    } else {
                      // 人數為1時，不分攤
                      updatedItem.total = Math.ceil(
                        effectiveQuantity * (updatedItem.unit_price || 0)
                      )
                    }
                  } else {
                    // 一般邏輯：小計 = 數量 × 單價
                    updatedItem.total = Math.ceil(effectiveQuantity * (updatedItem.unit_price || 0))
                  }
                }
                return updatedItem
              }
              return item
            })

            return {
              ...cat,
              items: updatedItems,
              total: updatedItems.reduce((sum, item) => sum + item.total, 0),
            }
          }
          return cat
        })

        // 如果有住宿或交通數據變更，需要更新所有領隊分攤項目
        if (category_id === 'accommodation' || category_id === 'transport') {
          return updateGuideItems(newCategories)
        }

        return newCategories
      })
    },
    [groupSize, groupSizeForGuide, setCategories, updateGuideItems]
  )

  const handleRemoveItem = useCallback(
    (category_id: string, itemId: string) => {
      setCategories(prev =>
        prev.map(cat => {
          if (cat.id === category_id) {
            const updatedItems = cat.items.filter(item => item.id !== itemId)

            // 如果是住宿類別，需要重新計算天數並重新編號
            if (category_id === 'accommodation' && updatedItems.length > 0) {
              // 取得所有唯一的天數
              const uniqueDays = Array.from(
                new Set(updatedItems.map(item => item.day).filter(d => d !== undefined))
              )
              uniqueDays.sort((a, b) => a! - b!)

              // 重新編號天數（從 1 開始）
              const reorderedItems = updatedItems.map(item => {
                const oldDay = item.day
                const newDay = uniqueDays.findIndex(d => d === oldDay) + 1
                return {
                  ...item,
                  day: newDay,
                }
              })

              // 更新 accommodationDays 為實際天數
              const actualDays = Math.max(...reorderedItems.map(item => item.day || 0))
              setAccommodationDays(actualDays)

              return {
                ...cat,
                items: reorderedItems,
                total: reorderedItems.reduce((sum, item) => sum + item.total, 0),
              }
            }

            return {
              ...cat,
              items: updatedItems,
              total: updatedItems.reduce((sum, item) => sum + item.total, 0),
            }
          }
          return cat
        })
      )
    },
    [setAccommodationDays, setCategories]
  )

  return {
    handleInsertItem,
    handleUpdateItem,
    handleRemoveItem,
  }
}
