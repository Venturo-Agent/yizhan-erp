'use client'

import { useCallback } from 'react'
import { CostItem, CostCategory } from '../_types'

interface UseTransportOperationsProps {
  categories: CostCategory[]
  setCategories: React.Dispatch<React.SetStateAction<CostCategory[]>>
  groupSizeForGuide: number
}

export const useTransportOperations = ({
  categories,
  setCategories,
  groupSizeForGuide,
}: UseTransportOperationsProps) => {
  // 使用特定的 categories 來計算領隊費用
  const calculateGuideWithCategories = useCallback((categories: CostCategory[]) => {
    // 1. 計算住宿每日第一個房型的單價總和
    const accommodationCategory = categories.find(cat => cat.id === 'accommodation')
    let dailyFirstRoomCost = 0

    if (accommodationCategory && accommodationCategory.items.length > 0) {
      const accommodationItems = accommodationCategory.items.filter(item => item.day !== undefined)
      const groupedByDay: Record<number, CostItem[]> = {}

      // 按天分組
      accommodationItems.forEach(item => {
        const day = item.day!
        if (!groupedByDay[day]) groupedByDay[day] = []
        groupedByDay[day].push(item)
      })

      // 計算每天第一個房型的單價
      Object.keys(groupedByDay).forEach(dayStr => {
        const dayItems = groupedByDay[Number(dayStr)]
        if (dayItems.length > 0) {
          dailyFirstRoomCost += dayItems[0].unit_price || 0
        }
      })
    }

    // 2. 計算成人費用
    const transportCategory = categories.find(cat => cat.id === 'transport')
    let adultTicketCost = 0

    if (transportCategory && transportCategory.items.length > 0) {
      const adultTicket = transportCategory.items.find(item => item.name === '成人')
      if (adultTicket) {
        adultTicketCost = adultTicket.adult_price || 0
      }
    }

    // 3. 領隊總成本 = 住宿第一房型總和 + 成人費用（不除法）
    const totalGuideCost = dailyFirstRoomCost + adultTicketCost

    return totalGuideCost
  }, [])

  // 更新所有領隊分攤項目
  const updateGuideItems = useCallback(
    (categories: CostCategory[]) => {
      // 重新計算領隊費用
      const totalGuideCost = calculateGuideWithCategories(categories)

      return categories.map(cat => {
        if (cat.id === 'group-transport') {
          const updatedItems = cat.items.map(item => {
            if (item.name === '領隊分攤') {
              const effectiveQuantity = item.quantity && item.quantity !== 1 ? item.quantity : 1
              return {
                ...item,
                unit_price: totalGuideCost,
                total:
                  groupSizeForGuide > 0
                    ? Math.ceil((totalGuideCost * effectiveQuantity) / groupSizeForGuide)
                    : 0,
              }
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
    },
    [calculateGuideWithCategories, groupSizeForGuide]
  )

  // 新增導遊項目
  const handleAddGuideRow = useCallback(
    (category_id: string) => {
      const totalGuideCost = calculateGuideWithCategories(categories)

      const newItem: CostItem = {
        id: Date.now().toString(),
        name: '領隊分攤',
        quantity: 1,
        unit_price: totalGuideCost,
        total: groupSizeForGuide > 0 ? Math.ceil(totalGuideCost / groupSizeForGuide) : 0,
        note: '自動計算：住宿第一房型 + 成人',
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
    [categories, calculateGuideWithCategories, groupSizeForGuide, setCategories]
  )

  // 新增交通項目（遊覽車等）
  const handleAddTransportRow = useCallback(
    (category_id: string) => {
      const newItem: CostItem = {
        id: Date.now().toString(),
        name: '遊覽車',
        quantity: 1,
        unit_price: null,
        total: 0,
        note: '',
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
    [setCategories]
  )

  // 新增成人
  const handleAddAdultTicket = useCallback(
    (category_id: string) => {
      const newItem: CostItem = {
        id: Date.now().toString(),
        name: '成人',
        quantity: null,
        unit_price: null,
        total: 0,
        note: '',
        pricing_type: 'by_identity',
        adult_price: null,
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
    [setCategories]
  )

  // 新增兒童
  const handleAddChildTicket = useCallback(
    (category_id: string) => {
      const newItem: CostItem = {
        id: Date.now().toString(),
        name: '兒童',
        quantity: null,
        unit_price: null,
        total: 0,
        note: '',
        pricing_type: 'by_identity',
        child_price: null,
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
    [setCategories]
  )

  // 新增嬰兒
  const handleAddInfantTicket = useCallback(
    (category_id: string) => {
      const newItem: CostItem = {
        id: Date.now().toString(),
        name: '嬰兒',
        quantity: null,
        unit_price: null,
        total: 0,
        note: '',
        pricing_type: 'by_identity',
        infant_price: null,
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
    [setCategories]
  )

  return {
    calculateGuideWithCategories,
    updateGuideItems,
    handleAddGuideRow,
    handleAddTransportRow,
    handleAddAdultTicket,
    handleAddChildTicket,
    handleAddInfantTicket,
  }
}
