/**
 * 景點排序管理 Hook
 * 處理景點的拖拽排序功能
 */

import { useCallback } from 'react'
import { updateAttraction } from '@/data'
import { Attraction } from '../_types'
import { logger } from '@/lib/utils/logger'

export function useAttractionsReorder() {
  /**
   * 批量更新景點順序
   * @param attractions 重新排序後的景點列表
   */
  const reorderAttractions = useCallback(async (attractions: Attraction[]) => {
    try {
      // 批量更新每個景點的 display_order
      const updatePromises = attractions.map((attraction, index) =>
        updateAttraction(attraction.id, {
          display_order: index,
        }).catch(error => {
          logger.error(`更新景點 ${attraction.name} 排序失敗:`, error)
          return null
        })
      )

      // 等待所有更新完成
      await Promise.allSettled(updatePromises)
    } catch (error) {
      logger.error('批量更新景點排序失敗:', error)
      throw error
    }
  }, [])

  /**
   * 更新單個景點的順序
   * @param attractionId 景點 ID
   * @param newOrder 新的順序
   */
  const updateAttractionOrder = useCallback(async (attractionId: string, newOrder: number) => {
    try {
      await updateAttraction(attractionId, { display_order: newOrder })
    } catch (error) {
      logger.error('更新景點順序失敗:', error)
      throw error
    }
  }, [])

  /**
   * 上移景點
   * @param attraction 要上移的景點
   * @param attractions 當前景點列表（已排序）
   */
  const moveUp = useCallback(async (attraction: Attraction, attractions: Attraction[]) => {
    const currentIndex = attractions.findIndex(a => a.id === attraction.id)
    if (currentIndex <= 0) return // 已經是第一個

    const targetAttraction = attractions[currentIndex - 1]
    const currentOrder = attraction.display_order
    const targetOrder = targetAttraction.display_order

    try {
      // 交換兩個景點的順序
      await Promise.all([
        updateAttraction(attraction.id, { display_order: targetOrder }),
        updateAttraction(targetAttraction.id, { display_order: currentOrder }),
      ])
    } catch (error) {
      logger.error('上移景點失敗:', error)
      throw error
    }
  }, [])

  /**
   * 下移景點
   * @param attraction 要下移的景點
   * @param attractions 當前景點列表（已排序）
   */
  const moveDown = useCallback(async (attraction: Attraction, attractions: Attraction[]) => {
    const currentIndex = attractions.findIndex(a => a.id === attraction.id)
    if (currentIndex === -1 || currentIndex >= attractions.length - 1) return // 已經是最後一個

    const targetAttraction = attractions[currentIndex + 1]
    const currentOrder = attraction.display_order
    const targetOrder = targetAttraction.display_order

    try {
      // 交換兩個景點的順序
      await Promise.all([
        updateAttraction(attraction.id, { display_order: targetOrder }),
        updateAttraction(targetAttraction.id, { display_order: currentOrder }),
      ])
    } catch (error) {
      logger.error('下移景點失敗:', error)
      throw error
    }
  }, [])

  return {
    reorderAttractions,
    updateAttractionOrder,
    moveUp,
    moveDown,
  }
}
