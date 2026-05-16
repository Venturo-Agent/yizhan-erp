import { useCallback } from 'react'
import { useTranslations } from 'next-intl'
import {
  useAttractions,
  createAttraction as createAttractionData,
  updateAttraction as updateAttractionData,
  deleteAttraction as deleteAttractionData,
  invalidateAttractions,
  useHotels,
  createHotel,
  updateHotel,
  deleteHotel,
  invalidateHotels,
  useRestaurants,
  createRestaurant,
  updateRestaurant,
  deleteRestaurant,
  invalidateRestaurants,
} from '@/data'
import { Attraction, AttractionFormData } from '../_types'
import { logger } from '@/lib/utils/logger'
import { confirm, alert } from '@/lib/ui/alert-dialog'

// ============================================
// Hook: 景點資料管理（使用 SWR 架構）
// ============================================

export type AttractionsTableName = 'attractions' | 'hotels' | 'restaurants'

/**
 * 景點資料管理 Hook
 *
 * ✅ 使用 @/data SWR hooks（自動載入 + 快取）
 * ✅ 提供向後相容的 API
 * ✅ 處理表單資料轉換
 * ✅ 支援 hotels / restaurants 獨立資料表
 */
export function useAttractionsData(tableName: AttractionsTableName = 'attractions') {
  const t = useTranslations('library')
  const attractionsResult = useAttractions({ all: true })
  const hotelsResult = useHotels({ all: true })
  const restaurantsResult = useRestaurants({ all: true })

  const { items: attractions, loading } =
    tableName === 'hotels'
      ? hotelsResult
      : tableName === 'restaurants'
        ? restaurantsResult
        : attractionsResult

  // 根據 tableName 選擇對應的 CRUD 操作
  const createFn =
    tableName === 'hotels'
      ? createHotel
      : tableName === 'restaurants'
        ? createRestaurant
        : createAttractionData
  const updateFn =
    tableName === 'hotels'
      ? updateHotel
      : tableName === 'restaurants'
        ? updateRestaurant
        : updateAttractionData
  const deleteFn =
    tableName === 'hotels'
      ? deleteHotel
      : tableName === 'restaurants'
        ? deleteRestaurant
        : deleteAttractionData
  const invalidateFn =
    tableName === 'hotels'
      ? invalidateHotels
      : tableName === 'restaurants'
        ? invalidateRestaurants
        : invalidateAttractions

  // 新增（處理表單資料轉換）
  const addAttraction = useCallback(
    async (formData: AttractionFormData) => {
      try {
        // 轉換表單資料為 Attraction 格式
        const baseData: Partial<Attraction> = {
          name: formData.name,
          english_name: formData.english_name || undefined,
          description: formData.description || undefined,
          country_id: formData.country_id,
          region_id: formData.region_id || undefined,
          city_id: formData.city_id || undefined,
          address: formData.address || undefined,
          phone: formData.phone || undefined,
          website: formData.website || undefined,
          images: formData.images ? formData.images.split(',').map(url => url.trim()) : [],
          notes: formData.notes || undefined,
          is_active: formData.is_active,
          latitude: formData.latitude || undefined,
          longitude: formData.longitude || undefined,
          display_order: 0,
        }

        // 景點特有欄位
        if (tableName === 'attractions') {
          baseData.category = formData.category
          baseData.tags = formData.tags ? formData.tags.split(',').map(t => t.trim()) : []
          baseData.duration_minutes = formData.duration_minutes || 60
          baseData.ticket_price = formData.ticket_price || undefined
          baseData.opening_hours = formData.opening_hours || undefined
        }

        await createFn(baseData as Omit<Attraction, 'id' | 'created_at' | 'updated_at'>)
        return { success: true }
      } catch (error) {
        return { success: false, error }
      }
    },
    [tableName, createFn]
  )

  // 更新（處理表單資料轉換）
  const updateAttraction = useCallback(
    async (id: string, formData: AttractionFormData) => {
      try {
        logger.log('[Attractions] 更新:', tableName, id)

        const baseData: Partial<Attraction> = {
          name: formData.name,
          english_name: formData.english_name || undefined,
          description: formData.description || undefined,
          country_id: formData.country_id,
          region_id: formData.region_id || undefined,
          city_id: formData.city_id || undefined,
          address: formData.address || undefined,
          phone: formData.phone || undefined,
          website: formData.website || undefined,
          images: formData.images
            ? formData.images
                .split(',')
                .map(url => url.trim())
                .filter(Boolean)
            : [],
          notes: formData.notes || undefined,
          is_active: formData.is_active,
          latitude: formData.latitude || undefined,
          longitude: formData.longitude || undefined,
        }

        // 景點特有欄位
        if (tableName === 'attractions') {
          baseData.category = formData.category || t('attractionsDataDefaultCategory')
          baseData.tags = formData.tags
            ? formData.tags
                .split(',')
                .map(t => t.trim())
                .filter(Boolean)
            : []
          baseData.duration_minutes = formData.duration_minutes || 60
          baseData.ticket_price = formData.ticket_price || undefined
          baseData.opening_hours = formData.opening_hours || undefined
        }

        const result = await updateFn(id, baseData)
        logger.log('[Attractions] 更新成功! 結果:', result)
        await invalidateFn()
        void alert(t('attractionsDataUpdated'), 'success')
        return { success: true }
      } catch (error) {
        logger.error('[Attractions] 更新失敗:', error)
        const errorMessage =
          error instanceof Error ? error.message : t('attractionsDataUpdateFailed')
        void alert(errorMessage, 'error')
        return { success: false, error }
      }
    },
    [tableName, updateFn, invalidateFn]
  )

  // 刪除
  const deleteAttractionHandler = useCallback(
    async (id: string) => {
      const confirmed = await confirm(t('attractionsDataDeleteConfirm'), {
        title: t('attractionsDataDeleteTitle'),
        type: 'warning',
      })
      if (!confirmed) return { success: false, cancelled: true }

      try {
        await deleteFn(id)
        return { success: true }
      } catch (error) {
        await alert(t('attractionsDataDeleteFailed'), 'error')
        return { success: false, error }
      }
    },
    [deleteFn]
  )

  // 切換啟用狀態
  const toggleStatus = useCallback(
    async (attraction: Attraction) => {
      try {
        await updateFn(attraction.id, {
          is_active: !attraction.is_active,
        })
        return { success: true }
      } catch (error) {
        return { success: false, error }
      }
    },
    [updateFn]
  )

  // 返回向後相容的 API
  return {
    attractions,
    loading,
    fetchAttractions: invalidateFn,
    addAttraction,
    updateAttraction,
    deleteAttraction: deleteAttractionHandler,
    toggleStatus,
  }
}
