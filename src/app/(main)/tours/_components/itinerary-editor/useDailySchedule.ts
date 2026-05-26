/**
 * useDailySchedule — 每日行程狀態與操作
 * 從 usePackageItinerary 拆出、負責 dailySchedule 所有 CRUD + 住宿狀態
 */

'use client'

import { useState, useCallback } from 'react'
import type { DailyScheduleItem, SimpleActivity, AccommodationStatus } from './types'
import { buildEmptyDailySchedule } from './usePackageItinerary.helpers'

export function useDailySchedule(initialDays = 5) {
  const [dailySchedule, setDailySchedule] = useState<DailyScheduleItem[]>(() =>
    buildEmptyDailySchedule(initialDays)
  )

  // 整批重設（載入行程 / 切換版本時用）
  const resetSchedule = useCallback((schedule: DailyScheduleItem[]) => {
    setDailySchedule(schedule)
  }, [])

  // 更新某天某欄位
  const updateDaySchedule = useCallback((index: number, field: string, value: string | boolean) => {
    setDailySchedule(prev => {
      const newSchedule = [...prev]
      if (field === 'route' || field === 'accommodation') {
        newSchedule[index] = { ...newSchedule[index], [field]: value }
      } else if (
        field === 'sameAsPrevious' ||
        field === 'hotelBreakfast' ||
        field === 'lunchSelf' ||
        field === 'dinnerSelf'
      ) {
        newSchedule[index] = { ...newSchedule[index], [field]: value as boolean }
      } else if (field.startsWith('meals.')) {
        const mealType = field.split('.')[1] as 'breakfast' | 'lunch' | 'dinner'
        newSchedule[index] = {
          ...newSchedule[index],
          meals: { ...newSchedule[index].meals, [mealType]: value as string },
        }
      }
      return newSchedule
    })
  }, [])

  // 新增活動
  const addActivity = useCallback((dayIndex: number) => {
    setDailySchedule(prev => {
      const newSchedule = [...prev]
      const newActivity: SimpleActivity = {
        id: `activity-${dayIndex}-${Date.now()}`,
        title: '',
        startTime: '',
        endTime: '',
      }
      newSchedule[dayIndex] = {
        ...newSchedule[dayIndex],
        activities: [...(newSchedule[dayIndex].activities || []), newActivity],
      }
      return newSchedule
    })
  }, [])

  // 移除活動
  const removeActivity = useCallback((dayIndex: number, activityIndex: number) => {
    setDailySchedule(prev => {
      const newSchedule = [...prev]
      const activities = [...(newSchedule[dayIndex].activities || [])]
      activities.splice(activityIndex, 1)
      newSchedule[dayIndex] = {
        ...newSchedule[dayIndex],
        activities: activities.length > 0 ? activities : undefined,
      }
      return newSchedule
    })
  }, [])

  // 從景點庫批次新增活動
  const addActivitiesFromAttractions = useCallback(
    (dayIndex: number, attractions: { name: string; id?: string }[]) => {
      setDailySchedule(prev => {
        const newSchedule = [...prev]
        const newActivities: SimpleActivity[] = attractions.map((attr, i) => ({
          id: `activity-${dayIndex}-${Date.now()}-${i}`,
          title: attr.name,
          startTime: '',
          endTime: '',
          attractionId: attr.id,
        }))
        newSchedule[dayIndex] = {
          ...newSchedule[dayIndex],
          activities: [...(newSchedule[dayIndex].activities || []), ...newActivities],
        }
        return newSchedule
      })
    },
    []
  )

  // 更新活動欄位
  const updateActivity = useCallback(
    (dayIndex: number, activityIndex: number, field: keyof SimpleActivity, value: string) => {
      setDailySchedule(prev => {
        const newSchedule = [...prev]
        const activities = [...(newSchedule[dayIndex].activities || [])]
        activities[activityIndex] = { ...activities[activityIndex], [field]: value }
        newSchedule[dayIndex] = { ...newSchedule[dayIndex], activities }
        return newSchedule
      })
    },
    []
  )

  // 取得前一天住宿（用來補「同前一天」的顯示文字）
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

  // 住宿填寫狀態（用來顯示完成度）
  const getAccommodationStatus = useCallback((): AccommodationStatus => {
    const requiredDays = dailySchedule.length - 1
    let filledCount = 0
    const accommodations: string[] = []

    for (let i = 0; i < requiredDays; i++) {
      const day = dailySchedule[i]
      if (day.accommodation || day.sameAsPrevious) {
        filledCount++
        accommodations.push(
          day.sameAsPrevious ? accommodations[accommodations.length - 1] || '' : day.accommodation
        )
      } else {
        accommodations.push('')
      }
    }

    return { isComplete: filledCount >= requiredDays, filledCount, requiredDays, accommodations }
  }, [dailySchedule])

  return {
    dailySchedule,
    resetSchedule,
    updateDaySchedule,
    addActivity,
    removeActivity,
    addActivitiesFromAttractions,
    updateActivity,
    getPreviousAccommodation,
    getAccommodationStatus,
  }
}
