'use client'

import { useState, useCallback } from 'react'
import { arrayMove } from '@dnd-kit/sortable'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import type { DailyScheduleItem } from '../_components/itinerary/DayRow'

export function useItineraryDrag(
  setDailySchedule: React.Dispatch<React.SetStateAction<DailyScheduleItem[]>>
) {
  const [activeDragName, setActiveDragName] = useState<string | null>(null)

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current
    // 資源庫拖曳 or 景點卡片拖曳
    const name = data?.resourceName || data?.attractionName || null
    setActiveDragName(name as string | null)
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveDragName(null)
      const { active, over } = event
      if (!over) return

      const overId = String(over.id)
      const data = active.data.current
      if (!data) return

      // === 景點卡片排序（同天 or 跨天）===
      if (data.type === 'itinerary-attraction') {
        const sourceDayIndex = data.sourceDayIndex as number
        const attractionId = data.attractionId as string
        const attractionName = data.attractionName as string
        const attractionVerified = data.attractionVerified as boolean | undefined

        // 目標是另一個景點卡片（同天排序）
        const overData = over.data?.current
        if (overData?.type === 'itinerary-attraction') {
          const targetDayIndex = overData.sourceDayIndex as number
          if (sourceDayIndex === targetDayIndex) {
            // 同天內排序
            setDailySchedule(prev => {
              const newSchedule = [...prev]
              const day = newSchedule[sourceDayIndex]
              if (!day) return prev
              const attractions = day.attractions || []
              const oldIdx = attractions.findIndex(a => a.id === attractionId)
              const newIdx = attractions.findIndex(a => a.id === String(over.id))
              if (oldIdx === -1 || newIdx === -1) return prev
              newSchedule[sourceDayIndex] = {
                ...day,
                attractions: arrayMove(attractions, oldIdx, newIdx),
              }
              return newSchedule
            })
          } else {
            // 跨天移動：從 source 移除，插入 target
            setDailySchedule(prev => {
              const newSchedule = [...prev]
              const sourceDay = newSchedule[sourceDayIndex]
              const targetDay = newSchedule[targetDayIndex]
              if (!sourceDay || !targetDay) return prev
              // 移除
              const sourceAttractions = (sourceDay.attractions || []).filter(
                a => a.id !== attractionId
              )
              // 插入到目標景點的位置
              const targetAttractions = [...(targetDay.attractions || [])]
              const targetIdx = targetAttractions.findIndex(a => a.id === String(over.id))
              targetAttractions.splice(targetIdx, 0, {
                id: attractionId,
                name: attractionName,
                verified: attractionVerified,
              })
              newSchedule[sourceDayIndex] = { ...sourceDay, attractions: sourceAttractions }
              newSchedule[targetDayIndex] = { ...targetDay, attractions: targetAttractions }
              return newSchedule
            })
          }
          return
        }

        // 目標是 drop zone（拖到空的一天）
        const dropMatch = overId.match(/^attraction-drop-(\d+)$/)
        if (dropMatch) {
          const targetDayIndex = parseInt(dropMatch[1], 10)
          if (targetDayIndex === sourceDayIndex) return // 同天，不用動
          setDailySchedule(prev => {
            const newSchedule = [...prev]
            const sourceDay = newSchedule[sourceDayIndex]
            const targetDay = newSchedule[targetDayIndex]
            if (!sourceDay || !targetDay) return prev
            const sourceAttractions = (sourceDay.attractions || []).filter(
              a => a.id !== attractionId
            )
            const targetAttractions = [
              ...(targetDay.attractions || []),
              { id: attractionId, name: attractionName, verified: attractionVerified },
            ]
            if (
              targetAttractions.some(
                (a, i) => targetAttractions.findIndex(b => b.id === a.id) !== i
              )
            )
              return prev // 已存在
            newSchedule[sourceDayIndex] = { ...sourceDay, attractions: sourceAttractions }
            newSchedule[targetDayIndex] = { ...targetDay, attractions: targetAttractions }
            return newSchedule
          })
          return
        }
        return
      }

      const resourceType = data.type as string
      const resourceId = data.resourceId as string
      const resourceName = data.resourceName as string
      const dataVerified = data.dataVerified as boolean | undefined

      // Parse drop zone ID: {zoneType}-drop-{dayIndex}
      const dropMatch = overId.match(
        /^(attraction|hotel|meal-breakfast|meal-lunch|meal-dinner)-drop-(\d+)$/
      )
      if (!dropMatch) return
      const zoneType = dropMatch[1]
      const dayIndex = parseInt(dropMatch[2], 10)
      if (isNaN(dayIndex)) return

      // Type validation
      if (zoneType === 'attraction' && resourceType !== 'attraction') return
      if (zoneType === 'hotel' && resourceType !== 'hotel') return
      if (zoneType.startsWith('meal-') && resourceType !== 'restaurant') return

      if (zoneType === 'attraction') {
        setDailySchedule(prev => {
          const newSchedule = [...prev]
          const day = newSchedule[dayIndex]
          if (!day) return prev
          const existing = day.attractions || []
          if (existing.some(a => a.id === resourceId)) return prev
          const newAttraction = {
            id: resourceId,
            name: resourceName,
            verified: dataVerified ?? true,
          }
          const newAttractions = [...existing, newAttraction]
          // 把景點名字加到 route 文字末尾
          const currentRoute = day.route || ''
          const newRoute = currentRoute.trim()
            ? currentRoute.trimEnd() +
              (currentRoute.trimEnd().endsWith('→') ? ' ' : ' → ') +
              resourceName
            : resourceName
          newSchedule[dayIndex] = { ...day, attractions: newAttractions, route: newRoute }
          return newSchedule
        })
      } else if (zoneType === 'hotel') {
        setDailySchedule(prev => {
          const newSchedule = [...prev]
          const day = newSchedule[dayIndex]
          if (!day) return prev
          newSchedule[dayIndex] = {
            ...day,
            accommodation: resourceName,
            accommodationId: resourceId,
            sameAsPrevious: false,
          }
          return newSchedule
        })
      } else if (zoneType === 'meal-breakfast') {
        setDailySchedule(prev => {
          const newSchedule = [...prev]
          const day = newSchedule[dayIndex]
          if (!day) return prev
          newSchedule[dayIndex] = {
            ...day,
            meals: { ...day.meals, breakfast: resourceName },
            mealIds: { ...day.mealIds, breakfast: resourceId },
            hotelBreakfast: false,
          }
          return newSchedule
        })
      } else if (zoneType === 'meal-lunch') {
        setDailySchedule(prev => {
          const newSchedule = [...prev]
          const day = newSchedule[dayIndex]
          if (!day) return prev
          newSchedule[dayIndex] = {
            ...day,
            meals: { ...day.meals, lunch: resourceName },
            mealIds: { ...day.mealIds, lunch: resourceId },
            lunchSelf: false,
          }
          return newSchedule
        })
      } else if (zoneType === 'meal-dinner') {
        setDailySchedule(prev => {
          const newSchedule = [...prev]
          const day = newSchedule[dayIndex]
          if (!day) return prev
          newSchedule[dayIndex] = {
            ...day,
            meals: { ...day.meals, dinner: resourceName },
            mealIds: { ...day.mealIds, dinner: resourceId },
            dinnerSelf: false,
          }
          return newSchedule
        })
      }
    },
    [setDailySchedule]
  )

  return { activeDragName, handleDragStart, handleDragEnd }
}
