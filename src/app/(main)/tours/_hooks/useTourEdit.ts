'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Tour, Itinerary, DailyItineraryDay } from '@/stores/types'
import type { Json } from '@/lib/supabase/types'
import { useCountries } from '@/data'
import { useAirports } from '@/app/(main)/tours/_hooks/useAirports'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { mutate } from 'swr'
import { logger } from '@/lib/utils/logger'
import { differenceInDays, addDays, format, parseISO } from 'date-fns'
import { zhTW } from 'date-fns/locale'

// ================================
// Types
// ================================

interface EditFormData {
  name: string
  // 🔧 核心表架構：統一用 countryId + countryName + airportCode
  countryId: string // countries.id (如 "japan")
  countryName: string // 顯示用 (如 "日本")
  airportCode: string // IATA 碼 (如 "NRT")
  airportCityName: string // 城市名 (如 "東京")
  departure_date: string
  return_date: string
  description: string
  enable_checkin: boolean
  tour_service_type: string // 團類型 (tour_group / flight / hotel ...)
}

export interface ItinerarySyncInfo {
  itinerary: Itinerary
  currentDays: number
  newDays: number
  action: 'increase' | 'decrease'
}

interface UseTourEditParams {
  tour: Tour | null
  isOpen: boolean
  onClose: () => void
  onSuccess?: (updatedTour: Tour) => void
}

// ================================
// Hook
// ================================

export function useTourEdit(params: UseTourEditParams) {
  const { tour, isOpen, onClose, onSuccess } = params

  const { items: countries } = useCountries({ all: true })
  const { airports } = useAirports()

  // Form state
  const [submitting, setSubmitting] = useState(false)
  const initializedRef = useRef(false)

  // Sync dialog state
  const [syncDialogOpen, setSyncDialogOpen] = useState(false)
  const [syncInfo, setSyncInfo] = useState<ItinerarySyncInfo | null>(null)
  const [pendingUpdatedTour, setPendingUpdatedTour] = useState<Tour | null>(null)

  const [formData, setFormData] = useState<EditFormData>({
    name: '',
    countryId: '',
    countryName: '',
    airportCode: '',
    airportCityName: '',
    departure_date: '',
    return_date: '',
    description: '',
    enable_checkin: false,
    tour_service_type: 'tour_group',
  })

  // Reset initialized state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      initializedRef.current = false
    }
  }, [isOpen])

  // 🔧 核心表架構：初始化表單、直接用 tour 的 country_id 和 airport_code
  // 5/13 William 反饋：之前等 countries 載入才 setFormData、Dialog 開啟瞬間空白像新增、
  // 改成立刻填 tour 既有資料、countries/airports 載入完再補顯示名稱
  useEffect(() => {
    if (!isOpen || !tour || initializedRef.current) return

    initializedRef.current = true

    // 先用 tour 內已有資料填、不等 countries / airports
    const countryId = tour.country_id || ''
    const countryName =
      countryId && countries.length > 0
        ? countries.find(c => c.id === countryId)?.name || ''
        : ''
    const airportCityName =
      tour.airport_code && airports.length > 0
        ? airports.find(a => a.iata_code === tour.airport_code)?.city_name_zh || ''
        : ''

    setFormData({
      name: tour.name,
      countryId,
      countryName,
      airportCode: tour.airport_code || '',
      airportCityName,
      departure_date: tour.departure_date || '',
      return_date: tour.return_date || '',
      description: tour.description || '',
      enable_checkin: tour.enable_checkin || false,
      tour_service_type:
        (tour as { tour_service_type?: string | null }).tour_service_type || 'tour_group',
    })
  }, [isOpen, tour]) // 不依賴 countries / airports、避免「等載入完才填」造成空白

  // countries / airports 載入完後、補顯示用名稱（不影響 form 寫入）
  useEffect(() => {
    if (!initializedRef.current || !tour) return
    if (tour.country_id && countries.length > 0) {
      const name = countries.find(c => c.id === tour.country_id)?.name || ''
      setFormData(prev => (prev.countryName !== name ? { ...prev, countryName: name } : prev))
    }
    if (tour.airport_code && airports.length > 0) {
      const cityName = airports.find(a => a.iata_code === tour.airport_code)?.city_name_zh || ''
      setFormData(prev =>
        prev.airportCityName !== cityName ? { ...prev, airportCityName: cityName } : prev,
      )
    }
  }, [countries, airports, tour])

  // Calculate tour days from dates
  const calculateTourDays = useCallback((departureDate: string, returnDate: string): number => {
    if (!departureDate || !returnDate) return 0
    return differenceInDays(parseISO(returnDate), parseISO(departureDate)) + 1
  }, [])

  // Check if itinerary needs sync after tour update
  const checkItinerarySync = useCallback(
    async (
      tourId: string,
      newDepartureDate: string,
      newReturnDate: string
    ): Promise<ItinerarySyncInfo | null> => {
      // Fetch linked itinerary
      const { data: itinerary, error } = await supabase
        .from('itineraries')
        .select(
          'id, tour_id, title, subtitle, tour_code, cover_image, country, city, departure_date, duration_days, meeting_info, leader, outbound_flight, return_flight, daily_itinerary, version_records, workspace_id, created_at, updated_at'
        )
        .eq('tour_id', tourId)
        .single()

      if (error || !itinerary) {
        // No linked itinerary, no sync needed
        return null
      }

      const newDays = calculateTourDays(newDepartureDate, newReturnDate)
      const dailyItinerary = itinerary.daily_itinerary as unknown as DailyItineraryDay[] | null
      const currentDays = dailyItinerary?.length || 0

      if (newDays === currentDays) {
        // Days match, no sync needed
        return null
      }

      return {
        itinerary: itinerary as unknown as Itinerary,
        currentDays,
        newDays,
        action: newDays > currentDays ? 'increase' : 'decrease',
      }
    },
    [calculateTourDays]
  )

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    if (!tour) return
    if (!formData.name.trim() || !formData.departure_date || !formData.return_date) {
      toast.error('請填寫必要欄位')
      return
    }

    setSubmitting(true)
    try {
      // 🔧 核心表架構：直接用 formData 的值，不用反查
      const countryId = formData.countryId || null
      const location = formData.airportCityName || ''

      const updates = {
        name: formData.name.trim(),
        location,
        country_id: countryId,
        airport_code: formData.airportCode || null,
        departure_date: formData.departure_date,
        return_date: formData.return_date,
        description: formData.description.trim(),
        enable_checkin: formData.enable_checkin,
        tour_service_type: formData.tour_service_type,
        updated_at: new Date().toISOString(),
      }

      const { data, error } = await supabase
        .from('tours')
        .update(updates)
        .eq('id', tour.id)
        .select()
        .single()

      if (error) throw error

      toast.success('旅遊團資料已更新')

      // 同步更新相關訂單和收款的 tour_name
      if (tour.name !== formData.name.trim()) {
        const newName = formData.name.trim()

        // 更新訂單
        await supabase.from('orders').update({ tour_name: newName }).eq('tour_id', tour.id)

        // 更新收款
        await supabase.from('receipts').update({ tour_name: newName }).eq('tour_id', tour.id)
      }

      // Reload data
      mutate(`tour-${tour.id}`)
      mutate('tours')
      mutate('orders') // 刷新訂單快取
      mutate('receipts') // 刷新收款快取
      mutate(
        (key: string) => typeof key === 'string' && key.startsWith('tours-paginated-'),
        undefined,
        { revalidate: true }
      )

      const updatedTour = data as Tour

      // Check if dates changed and itinerary needs sync
      const datesChanged =
        tour.departure_date !== formData.departure_date || tour.return_date !== formData.return_date

      if (datesChanged) {
        const syncNeeded = await checkItinerarySync(
          tour.id,
          formData.departure_date,
          formData.return_date
        )

        if (syncNeeded) {
          // Store updated tour and show sync dialog
          setPendingUpdatedTour(updatedTour)
          setSyncInfo(syncNeeded)
          setSyncDialogOpen(true)
          setSubmitting(false)
          return // Don't close yet, wait for sync decision
        }
      }

      // No sync needed, close dialog
      onSuccess?.(updatedTour)
      onClose()
    } catch (error) {
      logger.error('更新旅遊團失敗:', error)
      toast.error('更新失敗，請稍後再試')
    } finally {
      setSubmitting(false)
    }
  }, [tour, formData, onSuccess, onClose, checkItinerarySync])

  // Generate date label for itinerary day
  const generateDateLabel = useCallback((departureDate: string, dayIndex: number): string => {
    const date = addDays(parseISO(departureDate), dayIndex)
    const weekdays = ['日', '一', '二', '三', '四', '五', '六']
    const weekday = weekdays[date.getDay()]
    return `${format(date, 'M/d', { locale: zhTW })} (${weekday})`
  }, [])

  // Handle itinerary sync
  const handleSync = useCallback(
    async (action: 'adjust' | 'ignore', daysToRemove?: number[]) => {
      if (!syncInfo || !pendingUpdatedTour) {
        closeSyncDialog()
        onSuccess?.(pendingUpdatedTour!)
        onClose()
        return
      }

      if (action === 'ignore') {
        // User chose to ignore, close everything
        closeSyncDialog()
        onSuccess?.(pendingUpdatedTour)
        onClose()
        return
      }

      // action === 'adjust'
      try {
        const itinerary = syncInfo.itinerary
        const dailyItinerary = [...(itinerary.daily_itinerary || [])] as DailyItineraryDay[]

        if (syncInfo.action === 'decrease' && daysToRemove) {
          // Remove selected days (sort descending to avoid index shift issues)
          const sortedIndices = [...daysToRemove].sort((a, b) => b - a)
          for (const idx of sortedIndices) {
            dailyItinerary.splice(idx, 1)
          }

          // Update day labels and dates
          dailyItinerary.forEach((day, idx) => {
            day.dayLabel = `Day ${idx + 1}`
            day.date = generateDateLabel(formData.departure_date, idx)
          })
        } else if (syncInfo.action === 'increase') {
          // Add new days at the end
          const daysToAdd = syncInfo.newDays - syncInfo.currentDays

          // Find the last day's template (usually "返回台灣" pattern)
          const lastDay = dailyItinerary[dailyItinerary.length - 1]

          for (let i = 0; i < daysToAdd; i++) {
            const newDayIndex = dailyItinerary.length
            const newDay: DailyItineraryDay = {
              dayLabel: `Day ${newDayIndex + 1}`,
              date: generateDateLabel(formData.departure_date, newDayIndex),
              title: '自由活動',
              highlight: '',
              description: '',
              activities: [],
              recommendations: [],
              meals: {
                breakfast: '飯店早餐',
                lunch: '敬請自理',
                dinner: '敬請自理',
              },
              accommodation: lastDay?.accommodation || '',
              images: [],
            }
            dailyItinerary.push(newDay)
          }

          // Update all day dates based on new departure date
          dailyItinerary.forEach((day, idx) => {
            day.dayLabel = `Day ${idx + 1}`
            day.date = generateDateLabel(formData.departure_date, idx)
          })
        }

        // Update itinerary in database
        const { error } = await supabase
          .from('itineraries')
          .update({
            daily_itinerary: dailyItinerary as unknown as Json,
            departure_date: formData.departure_date,
            updated_at: new Date().toISOString(),
          })
          .eq('id', itinerary.id)

        if (error) {
          logger.error('同步行程表失敗:', error)
          toast.error('同步行程表失敗')
        } else {
          toast.success('行程表已同步更新')
          // Invalidate itinerary cache
          mutate(`itinerary-${itinerary.id}`)
          mutate('itineraries')
        }
      } catch (error) {
        logger.error('同步行程表失敗:', error)
        toast.error('同步行程表失敗')
      }

      closeSyncDialog()
      onSuccess?.(pendingUpdatedTour)
      onClose()
    },
    [syncInfo, pendingUpdatedTour, formData.departure_date, generateDateLabel, onSuccess, onClose]
  )

  // Close sync dialog
  const closeSyncDialog = useCallback(() => {
    setSyncDialogOpen(false)
    setSyncInfo(null)
    setPendingUpdatedTour(null)
  }, [])

  return {
    // Form state
    formData,
    setFormData,
    submitting,
    handleSubmit,
    // Sync dialog state
    syncDialogOpen,
    syncInfo,
    handleSync,
    closeSyncDialog,
  }
}
