/**
 * usePackageItinerary - 行程表對話框核心 Hook
 * 管理主要狀態、useEffect 載入邏輯、和子 hook 的組合
 * 重構：helpers / actions / dailySchedule 已分拆到子模組
 */

'use client'

import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { useAuthStore } from '@/stores'
import { useFlightSearch } from '@/hooks'
import { useItineraries, createItinerary } from '@/data'
import { supabase } from '@/lib/supabase/client'
import type { Itinerary } from '@/stores/types'
import type { FlightInfo } from '@/types/flight.types'
import { logger } from '@/lib/utils/logger'
import { alert } from '@/lib/ui/alert-dialog'
import { stripHtml } from '@/lib/utils/string-utils'
import { useSyncItineraryToCore } from '@/app/(main)/tours/_hooks/useTourItineraryItems'
import { toast } from 'sonner'
import type { ItineraryEditorContext, ItineraryFormData, PreviewDayData } from './types'
import {
  formatDailyItinerary,
  getPreviewDailyData as getPreviewData,
  generatePrintHtml,
} from './format-itinerary'
import {
  buildDailyScheduleFromItinerary,
  buildEmptyDailySchedule,
} from './usePackageItinerary.helpers'
import { submitItinerary, saveAsNewVersion } from './usePackageItinerary.actions'
import { useDailySchedule } from './useDailySchedule'

interface UsePackageItineraryOptions {
  isOpen: boolean
  context: ItineraryEditorContext
  onClose: () => void
  onItineraryCreated?: (itineraryId?: string) => void
}

export function usePackageItinerary({
  isOpen,
  context: ctx,
  onClose,
  onItineraryCreated,
}: UsePackageItineraryOptions) {
  const { items: itineraries, refresh } = useItineraries({ all: true })
  const create = createItinerary
  const { user: currentUser } = useAuthStore()
  const { syncToCore } = useSyncItineraryToCore()

  // 判斷是否為國內旅遊（台灣）
  const isDomestic = useMemo(() => {
    const dest = ctx.destination?.toLowerCase() || ''
    return dest.includes('台灣') || dest.includes('taiwan') || dest === 'tw'
  }, [ctx.destination])

  // 基本狀態
  const [isCreating, setIsCreating] = useState(false)
  const [isDataLoading, setIsDataLoading] = useState(true)
  const [createError, setCreateError] = useState<string | null>(null)
  const [formData, setFormData] = useState<ItineraryFormData>({
    title: '',
    description: '',
    outboundFlight: null,
    returnFlight: null,
  })

  // 航班搜尋輸入 state
  const [outboundFlightNumber, setOutboundFlightNumber] = useState('')
  const [outboundFlightDate, setOutboundFlightDate] = useState('')
  const [returnFlightNumber, setReturnFlightNumber] = useState('')
  const [returnFlightDate, setReturnFlightDate] = useState('')

  // 搜尋用的臨時航班 state
  const [searchOutboundFlight, setSearchOutboundFlight] = useState<FlightInfo | null>(null)
  const [searchReturnFlight, setSearchReturnFlight] = useState<FlightInfo | null>(null)

  // 當輸入改變時，更新搜尋用 state
  useEffect(() => {
    setSearchOutboundFlight(outboundFlightNumber ? { flightNumber: outboundFlightNumber } : null)
  }, [outboundFlightNumber])

  useEffect(() => {
    setSearchReturnFlight(returnFlightNumber ? { flightNumber: returnFlightNumber } : null)
  }, [returnFlightNumber])

  // 航班查詢（使用共用 hook）
  const flightSearch = useFlightSearch({
    outboundFlight: searchOutboundFlight,
    setOutboundFlight: flight => {
      setFormData(prev => ({ ...prev, outboundFlight: flight }))
      setOutboundFlightNumber('')
    },
    returnFlight: searchReturnFlight,
    setReturnFlight: flight => {
      setFormData(prev => ({ ...prev, returnFlight: flight }))
      setReturnFlightNumber('')
    },
    departureDate: outboundFlightDate || ctx?.start_date || '',
    days: String(ctx?.days || ''),
  })

  // 版本控制狀態
  const [selectedVersionIndex, setSelectedVersionIndex] = useState(-1)
  const [directLoadedItinerary, setDirectLoadedItinerary] = useState<Itinerary | null>(null)

  // 檢視模式：edit = 編輯模式, preview = 簡易行程表預覽
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit')

  // 追蹤 refs
  const hasInitializedDailyScheduleRef = useRef(false)
  const loadingRef = useRef(false)
  const prevIsOpenRef = useRef(false)

  // 時間軸模式
  const [isTimelineMode, setIsTimelineMode] = useState(false)
  const [selectedDayIndex, setSelectedDayIndex] = useState(0)

  // 每日行程子 hook
  const {
    dailySchedule,
    resetSchedule,
    updateDaySchedule,
    addActivity,
    removeActivity,
    addActivitiesFromAttractions,
    updateActivity,
    getPreviousAccommodation,
    getAccommodationStatus,
  } = useDailySchedule(ctx.days || 5)

  // 計算天數
  const calculateDays = useCallback(() => {
    if (!ctx.start_date || !ctx.end_date) return ctx.days || 5
    const start = new Date(ctx.start_date)
    const end = new Date(ctx.end_date)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
    return Math.max(1, Math.min(diffDays, 30))
  }, [ctx.start_date, ctx.end_date, ctx.days])

  // 從行程表載入每日資料（用 helper 純函數，再 setState）
  const loadDailyDataFromItinerary = useCallback(
    (itinerary: Itinerary, versionIndex: number, days: number) => {
      const { schedule, hasActivities, formPatch } = buildDailyScheduleFromItinerary(
        itinerary,
        versionIndex,
        days
      )
      resetSchedule(schedule)
      if (hasActivities) setIsTimelineMode(true)
      setFormData(prev => ({
        ...prev,
        ...(formPatch.title ? { title: formPatch.title } : {}),
        outboundFlight: formPatch.outboundFlight ?? prev.outboundFlight,
        returnFlight: formPatch.returnFlight ?? prev.returnFlight,
      }))
    },
    [resetSchedule]
  )

  // 載入行程表資料
  useEffect(() => {
    const justOpened = isOpen && !prevIsOpenRef.current
    prevIsOpenRef.current = isOpen

    if (justOpened && !loadingRef.current) {
      loadingRef.current = true
      setIsDataLoading(true)
      setCreateError(null)
      setSelectedVersionIndex(-1)
      setDirectLoadedItinerary(null)
      setViewMode('edit')
      hasInitializedDailyScheduleRef.current = false
      setFormData({
        title: ctx.title || ctx.version_name || '',
        description: '',
        outboundFlight: null,
        returnFlight: null,
      })
      setOutboundFlightNumber('')
      setOutboundFlightDate(ctx.start_date || '')
      setReturnFlightNumber('')
      setReturnFlightDate(ctx.end_date || '')

      const loadData = async () => {
        if (ctx.itinerary_id) {
          logger.log('[ItineraryEditor] 直接從資料庫載入行程表:', ctx.itinerary_id)
          const { data, error } = await supabase
            .from('itineraries')
            .select(
              'id, tour_id, title, subtitle, tour_code, cover_image, country, city, departure_date, duration_days, meeting_info, leader, outbound_flight, return_flight, daily_itinerary, version_records, workspace_id, created_at, updated_at'
            )
            .eq('id', ctx.itinerary_id)
            .single()

          if (!error && data) {
            logger.log(
              '[ItineraryEditor] 載入成功，版本數:',
              (data.version_records as unknown[])?.length || 0
            )
            setDirectLoadedItinerary(data as unknown as Itinerary)
          } else {
            logger.error('[ItineraryEditor] 載入失敗:', error)
          }
        }
        await refresh()
        setIsDataLoading(false)
        loadingRef.current = false
      }

      loadData().catch(err => logger.error('[loadData]', err))
    } else if (!isOpen) {
      loadingRef.current = false
    }
  }, [isOpen, ctx.itinerary_id, ctx.start_date, ctx.end_date, ctx.version_name, ctx.title, refresh])

  // 已關聯的行程表（透過 itinerary_id 查找）
  const linkedItineraries = useMemo(() => {
    return itineraries.filter(i => ctx.itinerary_id && i.id === ctx.itinerary_id)
  }, [itineraries, ctx.itinerary_id])

  // 當資料載入完成後初始化每日行程
  useEffect(() => {
    if (!isDataLoading && isOpen && !hasInitializedDailyScheduleRef.current) {
      hasInitializedDailyScheduleRef.current = true
      const days = calculateDays()
      const itinerary =
        directLoadedItinerary || linkedItineraries.find(i => i.id === ctx.itinerary_id)

      if (itinerary) {
        loadDailyDataFromItinerary(itinerary, -1, days)
      } else {
        resetSchedule(buildEmptyDailySchedule(days))
      }
    }
  }, [
    isDataLoading,
    isOpen,
    directLoadedItinerary,
    linkedItineraries,
    ctx.itinerary_id,
    calculateDays,
    loadDailyDataFromItinerary,
    resetSchedule,
  ])

  // 判斷是否為編輯模式
  const existingItinerary = useMemo(() => {
    return directLoadedItinerary || linkedItineraries.find(i => i.id === ctx.itinerary_id)
  }, [directLoadedItinerary, linkedItineraries, ctx.itinerary_id])

  const isEditMode = Boolean(existingItinerary)

  // 版本記錄
  const versionRecords = useMemo(() => {
    return (existingItinerary?.version_records ||
      []) as import('@/stores/types').ItineraryVersionRecord[]
  }, [existingItinerary])

  // 處理版本切換
  const handleVersionChange = useCallback(
    (index: number) => {
      setSelectedVersionIndex(index)
      const itinerary =
        directLoadedItinerary || linkedItineraries.find(i => i.id === ctx.itinerary_id)
      if (itinerary) {
        loadDailyDataFromItinerary(itinerary, index, calculateDays())
      }
    },
    [
      directLoadedItinerary,
      linkedItineraries,
      ctx.itinerary_id,
      calculateDays,
      loadDailyDataFromItinerary,
    ]
  )

  // 當前版本名稱
  const getCurrentVersionName = useCallback(() => {
    if (selectedVersionIndex === -1) {
      const firstVersion = versionRecords[0]
      return firstVersion?.note || stripHtml(existingItinerary?.title) || '主版本'
    }
    const record = versionRecords[selectedVersionIndex]
    return record?.note || `版本 ${record?.version || selectedVersionIndex + 1}`
  }, [selectedVersionIndex, versionRecords, existingItinerary])

  // 產生預覽資料
  const getPreviewDailyData = useCallback((): PreviewDayData[] => {
    return getPreviewData(dailySchedule, ctx.start_date || null)
  }, [dailySchedule, ctx.start_date])

  // 列印預覽
  const handlePrintPreview = useCallback(() => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const dailyData = getPreviewDailyData()
    const printContent = generatePrintHtml({
      title: formData.title,
      companyName: currentUser?.workspace_code || '旅行社',
      destination: ctx.destination || ctx.country_id || '',
      startDate: ctx.start_date || null,
      isDomestic,
      outboundFlight: formData.outboundFlight,
      returnFlight: formData.returnFlight,
      dailyData,
    })

    printWindow.document.write(printContent)
    printWindow.document.close()
    printWindow.print()
  }, [
    getPreviewDailyData,
    formData.title,
    formData.outboundFlight,
    formData.returnFlight,
    ctx.start_date,
    ctx.destination,
    ctx.country_id,
    currentUser?.workspace_code,
    isDomestic,
  ])

  // 提交表單（委託 actions 模組）
  const handleSubmit = useCallback(async () => {
    try {
      setIsCreating(true)
      setCreateError(null)

      const result = await submitItinerary({
        dailySchedule,
        ctx,
        formData,
        isEditMode,
        existingItinerary,
        currentUser,
        getPreviousAccommodation,
        create: create as (
          data: Omit<Itinerary, 'id' | 'created_at' | 'updated_at'>
        ) => Promise<Itinerary | null>,
        syncToCore,
        onItineraryCreated,
        onClose,
      })

      if (!result.ok) {
        setCreateError(result.errorMessage)
        void alert(`建立失敗: ${result.errorMessage}`, 'error')
      } else {
        if (result.refreshedItinerary) {
          setDirectLoadedItinerary(result.refreshedItinerary)
        }
        toast.success('行程表更新成功')
      }
    } finally {
      setIsCreating(false)
    }
  }, [
    dailySchedule,
    ctx,
    formData,
    isEditMode,
    existingItinerary,
    currentUser,
    getPreviousAccommodation,
    onItineraryCreated,
    onClose,
    create,
    syncToCore,
  ])

  // 另存新版本（委託 actions 模組）
  const handleSaveAsNewVersion = useCallback(async () => {
    if (!existingItinerary?.id) {
      await alert('請先儲存行程表才能另存新版本', 'warning')
      return
    }

    setIsCreating(true)
    try {
      const result = await saveAsNewVersion({
        existingItinerary,
        dailySchedule,
        versionRecords,
        ctx,
        getPreviousAccommodation,
        onItineraryCreated,
      })

      if (result.ok) {
        setDirectLoadedItinerary(prev =>
          prev ? { ...prev, version_records: result.updatedRecords } : null
        )
        setSelectedVersionIndex(result.newVersionIndex)
        toast.success('已另存為新版本')
      } else {
        toast.error('另存新版本失敗：未知錯誤')
      }
    } finally {
      setIsCreating(false)
    }
  }, [
    existingItinerary,
    dailySchedule,
    versionRecords,
    ctx,
    getPreviousAccommodation,
    onItineraryCreated,
  ])

  return {
    // 狀態
    isDataLoading,
    isCreating,
    createError,
    formData,
    setFormData,
    viewMode,
    setViewMode,
    isDomestic,
    isEditMode,
    existingItinerary,
    currentUser,

    // 航班相關
    outboundFlightNumber,
    setOutboundFlightNumber,
    outboundFlightDate,
    setOutboundFlightDate,
    returnFlightNumber,
    setReturnFlightNumber,
    returnFlightDate,
    setReturnFlightDate,
    flightSearch,

    // 版本控制
    selectedVersionIndex,
    versionRecords,
    handleVersionChange,
    getCurrentVersionName,

    // 每日行程
    dailySchedule,
    updateDaySchedule,
    calculateDays,
    getPreviousAccommodation,

    // 時間軸
    isTimelineMode,
    setIsTimelineMode,
    selectedDayIndex,
    setSelectedDayIndex,
    addActivity,
    addActivitiesFromAttractions,
    removeActivity,
    updateActivity,

    getAccommodationStatus,

    // 預覽
    getPreviewDailyData,
    handlePrintPreview,

    // 提交
    handleSubmit,
    handleSaveAsNewVersion,
  }
}
