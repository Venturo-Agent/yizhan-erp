'use client'

/**
 * useDailyScheduleActions — 每日行程表操作 hook
 *
 * 從 TourItineraryTab 抽出，包含：
 * - updateDaySchedule：更新單日欄位（route / meals / accommodation / sameAsPrevious 等）
 * - removeAttraction：從某天移除景點（含下游資料警告）
 * - reorderAttractions：重排景點順序
 */

import { useCallback } from 'react'
import { toast } from 'sonner'
import type { DailyScheduleItem } from '../_components/itinerary/DayRow'

interface CoreItemLike {
  day_number: number | null
  category: string | null
  resource_id?: string | null
  request_id?: string | null
  confirmation_status?: string | null
  leader_status?: string | null
  unit_price?: number | null
  quote_status?: string | null
}

interface UseDailyScheduleActionsParams {
  dailySchedule: DailyScheduleItem[]
  coreItems: CoreItemLike[]
  setDailySchedule: React.Dispatch<React.SetStateAction<DailyScheduleItem[]>>
}

export function useDailyScheduleActions({
  dailySchedule,
  coreItems,
  setDailySchedule,
}: UseDailyScheduleActionsParams) {
  const updateDaySchedule = useCallback(
    (index: number, field: string, value: string | boolean | undefined) => {
      setDailySchedule(prev => {
        const newSchedule = [...prev]
        if (field === 'accommodation' && value === '') {
          newSchedule[index] = {
            ...newSchedule[index],
            accommodation: '',
            accommodationId: undefined,
          }
          return newSchedule
        }
        // 取消續住 → 清空住宿欄讓用戶重新選擇
        if (field === 'sameAsPrevious' && value === false) {
          newSchedule[index] = {
            ...newSchedule[index],
            sameAsPrevious: false,
            accommodation: '',
            accommodationId: undefined,
          }
          return newSchedule
        }
        if (field === 'meals.breakfast' && value === '') {
          newSchedule[index] = {
            ...newSchedule[index],
            meals: { ...newSchedule[index].meals, breakfast: '' },
            mealIds: { ...newSchedule[index].mealIds, breakfast: undefined },
          }
          return newSchedule
        }
        if (field === 'meals.lunch' && value === '') {
          newSchedule[index] = {
            ...newSchedule[index],
            meals: { ...newSchedule[index].meals, lunch: '' },
            mealIds: { ...newSchedule[index].mealIds, lunch: undefined },
          }
          return newSchedule
        }
        if (field === 'meals.dinner' && value === '') {
          newSchedule[index] = {
            ...newSchedule[index],
            meals: { ...newSchedule[index].meals, dinner: '' },
            mealIds: { ...newSchedule[index].mealIds, dinner: undefined },
          }
          return newSchedule
        }
        if (field.startsWith('meals.')) {
          const mealType = field.split('.')[1] as 'breakfast' | 'lunch' | 'dinner'
          newSchedule[index] = {
            ...newSchedule[index],
            meals: { ...newSchedule[index].meals, [mealType]: value as string },
          }
        } else {
          newSchedule[index] = { ...newSchedule[index], [field]: value }
        }
        return newSchedule
      })
    },
    [setDailySchedule]
  )

  const removeAttraction = useCallback(
    async (dayIdx: number, attractionId: string) => {
      // 找到要刪除的景點名稱（用於通知）
      const day = dailySchedule[dayIdx]
      const attraction = day?.attractions?.find(a => a.id === attractionId)
      const attractionName = attraction?.name || '景點'

      // 檢查核心表是否有下游資料（需求單、確認單、Local 報價確認）
      const dayNumber = dayIdx + 1
      const relatedCoreItem = coreItems.find(
        item =>
          item.day_number === dayNumber &&
          item.category === 'activities' &&
          item.resource_id === attractionId
      )

      // 判斷是否有下游資料
      const hasDownstream =
        relatedCoreItem &&
        (relatedCoreItem.request_id != null || // 已發需求單
          relatedCoreItem.confirmation_status !== 'none' || // 已確認
          relatedCoreItem.leader_status !== 'none' || // 領隊已填寫
          (relatedCoreItem.unit_price != null &&
            relatedCoreItem.unit_price > 0 &&
            relatedCoreItem.quote_status === 'confirmed')) // Local 報價已確認

      // 如果有其他下游資料、顯示警告
      if (hasDownstream) {
        const warnings = []
        if (relatedCoreItem.request_id) warnings.push('已發需求單（已產生取消單）')
        if (relatedCoreItem.confirmation_status !== 'none') warnings.push('已確認訂位')
        if (relatedCoreItem.leader_status !== 'none') warnings.push('領隊已填寫')
        if (
          relatedCoreItem.unit_price != null &&
          relatedCoreItem.unit_price > 0 &&
          relatedCoreItem.quote_status === 'confirmed'
        ) {
          warnings.push(`已確認報價 ${relatedCoreItem.unit_price.toLocaleString()} 元`)
        }

        if (warnings.length > 0) {
          toast.warning(`⚠️ 刪除景點「${attractionName}」\n\n此景點${warnings.join('、')}`, {
            duration: 6000,
            style: { whiteSpace: 'pre-line', maxWidth: '500px' },
          })
        }
      }

      // 不管有沒有下游資料，都刪除（行程是 SSOT）
      setDailySchedule(prev => {
        const newSchedule = [...prev]
        const d = newSchedule[dayIdx]
        if (!d) return prev
        const updated = (d.attractions || []).filter(a => a.id !== attractionId)
        newSchedule[dayIdx] = { ...d, attractions: updated }
        return newSchedule
      })
    },
    [dailySchedule, coreItems, setDailySchedule]
  )

  const reorderAttractions = useCallback(
    (dayIdx: number, newOrder: { id: string; name: string }[]) => {
      setDailySchedule(prev => {
        const newSchedule = [...prev]
        const d = newSchedule[dayIdx]
        if (!d) return prev
        newSchedule[dayIdx] = { ...d, attractions: newOrder }
        return newSchedule
      })
    },
    [setDailySchedule]
  )

  const getPreviousAccommodation = useCallback(
    (index: number): string => {
      if (index === 0) return ''
      for (let i = index - 1; i >= 0; i--) {
        if (!dailySchedule[i].sameAsPrevious && dailySchedule[i].accommodation) {
          return dailySchedule[i].accommodation
        }
      }
      return ''
    },
    [dailySchedule]
  )

  return { updateDaySchedule, removeAttraction, reorderAttractions, getPreviousAccommodation }
}
