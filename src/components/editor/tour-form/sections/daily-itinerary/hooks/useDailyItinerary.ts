'use client'

import { useState, useRef, useMemo } from 'react'
import { TourFormData } from '../../../types'
import { AttractionWithCity, MealSelectorState } from '../types'
import { HotelItem } from '@/components/editor/HotelSelector'
import { Restaurant, MichelinRestaurant } from '@/components/editor/RestaurantSelector'
import { supabase } from '@/lib/supabase/client'
import { createImageLibraryItem } from '@/data/entities/image-library'
import { useAuthStore } from '@/stores/auth-store'
import { logger } from '@/lib/utils/logger'
import { toast } from 'sonner'
import { alert } from '@/lib/ui/alert-dialog'
import { COMP_EDITOR_LABELS } from '../../../../constants/labels'

type CombinedRestaurant = (Restaurant | MichelinRestaurant) & {
  source: 'restaurant' | 'michelin'
  city_name?: string
}

interface UseDailyItineraryProps {
  data: TourFormData
  updateDailyItinerary: (index: number, field: string, value: unknown) => void
  updateActivity: (dayIndex: number, actIndex: number, field: string, value: string) => void
  addActivity: (dayIndex: number) => void
}

export function useDailyItinerary({
  data,
  updateDailyItinerary,
  updateActivity,
  addActivity,
}: UseDailyItineraryProps) {
  const workspaceId = useAuthStore(state => state.user?.workspace_id)

  // 選擇器狀態
  const [showAttractionSelector, setShowAttractionSelector] = useState(false)
  const [showHotelSelector, setShowHotelSelector] = useState(false)
  const [showRestaurantSelector, setShowRestaurantSelector] = useState(false)
  const [currentDayIndex, setCurrentDayIndex] = useState<number>(-1)
  const [currentMealSelector, setCurrentMealSelector] = useState<MealSelectorState | null>(null)

  // 圖片上傳相關狀態
  const [uploadingActivityImage, setUploadingActivityImage] = useState<{
    dayIndex: number
    actIndex: number
  } | null>(null)
  const activityFileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({})

  // 景點圖片位置調整狀態
  const [activityPositionEditor, setActivityPositionEditor] = useState<{
    isOpen: boolean
    dayIndex: number
    actIndex: number
  } | null>(null)

  // 圖庫儲存狀態
  const [saveToLibraryDialog, setSaveToLibraryDialog] = useState<{
    isOpen: boolean
    filePath: string
    publicUrl: string
    activityTitle: string
  } | null>(null)
  const [libraryImageName, setLibraryImageName] = useState('')
  const [isSavingToLibrary, setIsSavingToLibrary] = useState(false)

  // 收集所有已選景點的 ID（用於防止重複選取）
  const existingAttractionIds = useMemo(() => {
    const ids: string[] = []
    data.dailyItinerary?.forEach(day => {
      day.activities?.forEach(activity => {
        if (activity.attraction_id) {
          ids.push(activity.attraction_id)
        }
      })
    })
    return ids
  }, [data.dailyItinerary])

  // 開啟景點選擇器
  const handleOpenAttractionSelector = (dayIndex: number) => {
    setCurrentDayIndex(dayIndex)
    setShowAttractionSelector(true)
  }

  // 開啟飯店選擇器
  const handleOpenHotelSelector = (dayIndex: number) => {
    setCurrentDayIndex(dayIndex)
    setShowHotelSelector(true)
  }

  // 開啟餐廳選擇器
  const handleOpenRestaurantSelector = (
    dayIndex: number,
    mealType: 'breakfast' | 'lunch' | 'dinner'
  ) => {
    setCurrentDayIndex(dayIndex)
    setCurrentMealSelector({ dayIndex, mealType })
    setShowRestaurantSelector(true)
  }

  // 處理景點選擇
  const handleSelectAttractions = async (attractions: AttractionWithCity[]) => {
    if (currentDayIndex === -1) return

    for (const attraction of attractions) {
      const day = data.dailyItinerary[currentDayIndex]
      // 確保 activities 陣列存在（舊資料可能沒有這個欄位）
      const activities = day?.activities || []
      const newActivityIndex = activities.length
      addActivity(currentDayIndex)
      updateActivity(currentDayIndex, newActivityIndex, 'attraction_id', attraction.id)
      updateActivity(currentDayIndex, newActivityIndex, 'icon', '📍')
      updateActivity(currentDayIndex, newActivityIndex, 'title', attraction.name)
      updateActivity(currentDayIndex, newActivityIndex, 'description', attraction.description || '')

      // 智能圖片選擇邏輯
      let imageUrl = ''
      if (attraction.images && attraction.images.length > 0) {
        imageUrl = attraction.images[0]
      } else if (workspaceId) {
        try {
          const { data: libraryImages, error } = await supabase
            .from('image_library')
            .select('public_url')
            .eq('workspace_id', workspaceId)
            .eq('category', 'activity')
            .eq('name', attraction.name)
            .order('created_at', { ascending: false })
            .limit(1)

          if (!error && libraryImages && libraryImages.length > 0) {
            imageUrl = libraryImages[0].public_url
          }
        } catch (error) {
          logger.error(COMP_EDITOR_LABELS.搜尋圖庫圖片失敗, error)
        }
      }

      updateActivity(currentDayIndex, newActivityIndex, 'image', imageUrl)
    }
    setCurrentDayIndex(-1)
  }

  // 處理飯店選擇
  const handleSelectHotels = (hotels: HotelItem[]) => {
    if (currentDayIndex === -1 || hotels.length === 0) return

    const hotel = hotels[0]
    updateDailyItinerary(currentDayIndex, 'accommodation', hotel.name)
    updateDailyItinerary(currentDayIndex, 'accommodationRating', hotel.star_rating || 5)
    setCurrentDayIndex(-1)
    toast.success(`已選擇: ${hotel.name}`)
  }

  // 處理餐廳選擇
  const handleSelectRestaurants = (restaurants: CombinedRestaurant[]) => {
    if (!currentMealSelector || restaurants.length === 0) return

    const { dayIndex, mealType } = currentMealSelector
    const restaurant = restaurants[0]
    const day = data.dailyItinerary[dayIndex]

    let restaurantText = restaurant.name
    const isMichelin = restaurant.source === 'michelin'
    const michelinStars = 'michelin_stars' in restaurant ? restaurant.michelin_stars : null
    if (isMichelin && michelinStars) {
      restaurantText = `${'⭐'.repeat(michelinStars)} ${restaurant.name}`
    }

    updateDailyItinerary(dayIndex, 'meals', {
      ...day.meals,
      [mealType]: restaurantText,
    })
    setCurrentMealSelector(null)
    toast.success(`已選擇: ${restaurantText}`)
  }

  // 上傳活動圖片
  const handleActivityImageUpload = async (dayIndex: number, actIndex: number, file: File) => {
    if (!file.type.startsWith('image/')) {
      void alert(COMP_EDITOR_LABELS.請選擇圖片檔案, 'warning')
      return
    }

    setUploadingActivityImage({ dayIndex, actIndex })

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `activity-${dayIndex + 1}-${actIndex + 1}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`
      const filePath = `tour-activity-images/${fileName}`

      const { data: _uploadData, error: uploadError } = await supabase.storage
        .from('workspace-files')
        .upload(filePath, file)

      if (uploadError) {
        logger.error(COMP_EDITOR_LABELS.上傳失敗, uploadError)
        void alert(`圖片上傳失敗: ${uploadError.message}`, 'error')
        return
      }

      const { data: urlData } = supabase.storage.from('workspace-files').getPublicUrl(filePath)

      updateActivity(dayIndex, actIndex, 'image', urlData.publicUrl)

      const currentActivity = data.dailyItinerary?.[dayIndex]?.activities?.[actIndex]
      const activityTitle = currentActivity?.title || COMP_EDITOR_LABELS.景點圖片
      setSaveToLibraryDialog({
        isOpen: true,
        filePath,
        publicUrl: urlData.publicUrl,
        activityTitle,
      })
      setLibraryImageName(activityTitle)
    } catch (error) {
      logger.error(COMP_EDITOR_LABELS.意外錯誤, error)
      void alert(COMP_EDITOR_LABELS.上傳過程發生錯誤, 'error')
    } finally {
      setUploadingActivityImage(null)
    }
  }

  // 從外部 URL 上傳圖片（Unsplash/Pexels）
  const handleExternalImageUpload = async (
    dayIndex: number,
    actIndex: number,
    imageUrl: string
  ) => {
    setUploadingActivityImage({ dayIndex, actIndex })

    try {
      // 下載圖片
      const response = await fetch(imageUrl)
      if (!response.ok) {
        throw new Error(COMP_EDITOR_LABELS.無法下載圖片)
      }

      const blob = await response.blob()
      const fileExt = blob.type.split('/')[1] || 'jpg'
      const fileName = `activity-${dayIndex + 1}-${actIndex + 1}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`
      const filePath = `tour-activity-images/${fileName}`

      // 上傳到 Supabase
      const { error: uploadError } = await supabase.storage
        .from('workspace-files')
        .upload(filePath, blob)

      if (uploadError) {
        logger.error(COMP_EDITOR_LABELS.上傳失敗, uploadError)
        toast.error(`圖片上傳失敗: ${uploadError.message}`)
        return
      }

      const { data: urlData } = supabase.storage.from('workspace-files').getPublicUrl(filePath)

      updateActivity(dayIndex, actIndex, 'image', urlData.publicUrl)

      const currentActivity = data.dailyItinerary?.[dayIndex]?.activities?.[actIndex]
      const activityTitle = currentActivity?.title || COMP_EDITOR_LABELS.景點圖片
      setSaveToLibraryDialog({
        isOpen: true,
        filePath,
        publicUrl: urlData.publicUrl,
        activityTitle,
      })
      setLibraryImageName(activityTitle)
      toast.success(COMP_EDITOR_LABELS.圖片已儲存)
    } catch (error) {
      logger.error(COMP_EDITOR_LABELS.外部圖片上傳失敗, error)
      toast.error(COMP_EDITOR_LABELS.圖片下載或上傳失敗)
    } finally {
      setUploadingActivityImage(null)
    }
  }

  // 儲存到圖庫
  const handleSaveToLibrary = async () => {
    if (!saveToLibraryDialog || !workspaceId) {
      toast.error(COMP_EDITOR_LABELS.缺少必要資料_無法儲存)
      return
    }

    setIsSavingToLibrary(true)
    try {
      await createImageLibraryItem({
        workspace_id: workspaceId,
        name: libraryImageName || COMP_EDITOR_LABELS.未命名圖片,
        file_path: saveToLibraryDialog.filePath,
        public_url: saveToLibraryDialog.publicUrl,
        category: 'activity',
        tags: [COMP_EDITOR_LABELS.景點, COMP_EDITOR_LABELS.活動],
      })

      toast.success(COMP_EDITOR_LABELS.已儲存到圖庫)
    } catch (_error) {
      toast.error(`儲存過程發生錯誤`)
    } finally {
      setIsSavingToLibrary(false)
      setSaveToLibraryDialog(null)
      setLibraryImageName('')
    }
  }

  return {
    // States
    showAttractionSelector,
    showHotelSelector,
    showRestaurantSelector,
    currentDayIndex,
    currentMealSelector,
    uploadingActivityImage,
    activityFileInputRefs,
    activityPositionEditor,
    saveToLibraryDialog,
    libraryImageName,
    isSavingToLibrary,
    existingAttractionIds,

    // Setters
    setShowAttractionSelector,
    setShowHotelSelector,
    setShowRestaurantSelector,
    setCurrentDayIndex,
    setCurrentMealSelector,
    setActivityPositionEditor,
    setSaveToLibraryDialog,
    setLibraryImageName,

    // Handlers
    handleOpenAttractionSelector,
    handleOpenHotelSelector,
    handleOpenRestaurantSelector,
    handleSelectAttractions,
    handleSelectHotels,
    handleSelectRestaurants,
    handleActivityImageUpload,
    handleExternalImageUpload,
    handleSaveToLibrary,
  }
}
