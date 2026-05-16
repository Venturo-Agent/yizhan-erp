'use client'

import { useEffect, useRef, useCallback } from 'react'
import { CostCategory } from '../_types'

interface UseQuoteGroupCostUpdateProps {
  groupSize: number
  groupSizeForGuide: number
  setCategories: React.Dispatch<React.SetStateAction<CostCategory[]>>
}

export const useQuoteGroupCostUpdate = ({
  groupSize,
  groupSizeForGuide,
  setCategories,
}: UseQuoteGroupCostUpdateProps) => {
  // 使用 ref 追蹤前一次的 groupSize 和 groupSizeForGuide
  const prevGroupSizeRef = useRef<number | null>(null)
  const prevGroupSizeForGuideRef = useRef<number | null>(null)
  // 追蹤是否已經用有效人數計算過
  const hasCalculatedWithValidGroupSize = useRef(false)

  // 重新計算所有團體分攤項目的邏輯（抽出來方便重用）
  const recalculateGroupCosts = useCallback(
    (currentGroupSize: number, currentGroupSizeForGuide: number) => {
      // 只有當人數有效時才計算
      if (currentGroupSizeForGuide <= 0) return

      setCategories(prevCategories => {
        return prevCategories.map(category => {
          if (
            category.id === 'group-transport' ||
            category.id === 'transport' ||
            category.id === 'guide'
          ) {
            const updatedItems = category.items.map(item => {
              const effectiveQuantity = item.quantity && item.quantity !== 1 ? item.quantity : 1
              let total = 0

              if (category.id === 'group-transport') {
                // 團體分攤分類：自動執行團體分攤邏輯
                if (item.name === '領隊分攤') {
                  // 領隊分攤：(單價 × 數量) ÷ 人數（不含嬰兒）
                  const guideTotalCost = (item.unit_price || 0) * effectiveQuantity
                  total =
                    currentGroupSizeForGuide > 0
                      ? Math.ceil(guideTotalCost / currentGroupSizeForGuide)
                      : 0
                } else if (currentGroupSizeForGuide > 1) {
                  // 其他團體分攤項目：執行一般團體分攤邏輯（不含嬰兒）
                  const total_cost = effectiveQuantity * (item.unit_price || 0)
                  total = Math.ceil(total_cost / currentGroupSizeForGuide)
                } else {
                  // 人數為1時，不分攤
                  total = Math.ceil(effectiveQuantity * (item.unit_price || 0))
                }
              } else if (category.id === 'guide' && !item.is_group_cost) {
                // 領隊導遊個人費用（小費）：不分攤，total = unit_price
                total = item.unit_price || 0
              } else if (
                (category.id === 'transport' || category.id === 'guide') &&
                item.is_group_cost &&
                currentGroupSize > 1
              ) {
                // 交通和領隊導遊的團體分攤邏輯（出差費）：小計 = (數量 × 單價) ÷ 團體人數
                const total_cost = effectiveQuantity * (item.unit_price || 0)
                total = Math.ceil(total_cost / currentGroupSize)
              } else {
                // 維持原有的 total 值
                total = item.total || 0
              }

              return { ...item, total }
            })

            const categoryTotal = updatedItems.reduce((sum, item) => sum + (item.total || 0), 0)
            return { ...category, items: updatedItems, total: categoryTotal }
          }
          return category
        })
      })
    },
    [setCategories]
  )

  // 當人數改變時，重新計算所有團體分攤項目
  useEffect(() => {
    // 如果人數還沒載入（為0），等待下一次 render
    if (groupSizeForGuide <= 0) {
      return
    }

    // 首次用有效人數計算，或人數有變動時才執行
    const shouldRecalculate =
      !hasCalculatedWithValidGroupSize.current ||
      prevGroupSizeRef.current !== groupSize ||
      prevGroupSizeForGuideRef.current !== groupSizeForGuide

    if (!shouldRecalculate) {
      return
    }

    // 更新 ref
    prevGroupSizeRef.current = groupSize
    prevGroupSizeForGuideRef.current = groupSizeForGuide
    hasCalculatedWithValidGroupSize.current = true

    recalculateGroupCosts(groupSize, groupSizeForGuide)

    setCategories(prevCategories => {
      return prevCategories.map(category => {
        if (
          category.id === 'group-transport' ||
          category.id === 'transport' ||
          category.id === 'guide'
        ) {
          const updatedItems = category.items.map(item => {
            const effectiveQuantity = item.quantity && item.quantity !== 1 ? item.quantity : 1
            let total = 0

            if (category.id === 'group-transport') {
              // 團體分攤分類：自動執行團體分攤邏輯
              if (item.name === '領隊分攤') {
                // 領隊分攤：(單價 × 數量) ÷ 人數（不含嬰兒）
                const guideTotalCost = (item.unit_price || 0) * effectiveQuantity
                total = groupSizeForGuide > 0 ? Math.ceil(guideTotalCost / groupSizeForGuide) : 0
              } else if (groupSizeForGuide > 1) {
                // 其他團體分攤項目：執行一般團體分攤邏輯（不含嬰兒）
                const total_cost = effectiveQuantity * (item.unit_price || 0)
                total = Math.ceil(total_cost / groupSizeForGuide)
              } else {
                // 人數為1時，不分攤
                total = Math.ceil(effectiveQuantity * (item.unit_price || 0))
              }
            } else if (
              (category.id === 'transport' || category.id === 'guide') &&
              item.is_group_cost &&
              groupSize > 1
            ) {
              // 交通和領隊導遊的團體分攤邏輯：小計 = (數量 × 單價) ÷ 團體人數
              const total_cost = effectiveQuantity * (item.unit_price || 0)
              total = Math.ceil(total_cost / groupSize)
            } else {
              // 維持原有的 total 值
              total = item.total || 0
            }

            return { ...item, total }
          })

          const categoryTotal = updatedItems.reduce((sum, item) => sum + (item.total || 0), 0)
          return { ...category, items: updatedItems, total: categoryTotal }
        }
        return category
      })
    })
  }, [groupSize, groupSizeForGuide, setCategories]) // 只依賴數值，不依賴 participantCounts 對象
}
