'use client'

import { useState, useEffect, useCallback } from 'react'
import { logger } from '@/lib/utils/logger'

interface MapCenter {
  latitude: number
  longitude: number
  zoom: number
}

interface MapPreferences {
  expanded: boolean
  center: MapCenter | null
}

const _DEFAULT_ZOOM = 12

/**
 * 管理地圖偏好設定（展開/收合、最後位置）
 * 使用 localStorage 持久化
 */
export function useMapPreferences(tourId: string | null) {
  const [preferences, setPreferences] = useState<MapPreferences>({
    expanded: false, // 預設收合
    center: null,
  })
  const [isLoaded, setIsLoaded] = useState(false)

  // 從 localStorage 讀取
  useEffect(() => {
    if (!tourId) {
      setIsLoaded(true)
      return
    }

    try {
      // 讀取展開狀態
      const expandedKey = `map_expanded_${tourId}`
      const expandedValue = localStorage.getItem(expandedKey)
      const expanded = expandedValue === null ? false : expandedValue === 'true'

      // 讀取最後位置
      const centerKey = `map_center_${tourId}`
      const centerValue = localStorage.getItem(centerKey)
      const center = centerValue ? JSON.parse(centerValue) : null

      setPreferences({ expanded, center })
    } catch (error) {
      logger.error('讀取地圖偏好失敗:', error)
    } finally {
      setIsLoaded(true)
    }
  }, [tourId])

  // 設定展開/收合
  const setExpanded = useCallback(
    (expanded: boolean) => {
      setPreferences(prev => ({ ...prev, expanded }))

      if (tourId) {
        try {
          localStorage.setItem(`map_expanded_${tourId}`, String(expanded))
        } catch (error) {
          logger.error('儲存地圖展開狀態失敗:', error)
        }
      }
    },
    [tourId]
  )

  // 設定最後位置
  const setCenter = useCallback(
    (center: MapCenter) => {
      setPreferences(prev => ({ ...prev, center }))

      if (tourId) {
        try {
          localStorage.setItem(`map_center_${tourId}`, JSON.stringify(center))
        } catch (error) {
          logger.error('儲存地圖位置失敗:', error)
        }
      }
    },
    [tourId]
  )

  // 清除位置（回到預設）
  const clearCenter = useCallback(() => {
    setPreferences(prev => ({ ...prev, center: null }))

    if (tourId) {
      try {
        localStorage.removeItem(`map_center_${tourId}`)
      } catch (error) {
        logger.error('清除地圖位置失敗:', error)
      }
    }
  }, [tourId])

  // Toggle 展開/收合
  const toggleExpanded = useCallback(() => {
    setExpanded(!preferences.expanded)
  }, [preferences.expanded, setExpanded])

  return {
    isLoaded,
    expanded: preferences.expanded,
    center: preferences.center,
    setExpanded,
    setCenter,
    clearCenter,
    toggleExpanded,
  }
}
