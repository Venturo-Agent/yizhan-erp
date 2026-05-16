'use client'

/**
 * TourItineraryTab - 旅遊團簡易行程表分頁
 *
 * 上下分欄設計：
 * - 上半部：團層級資料（標題、天數、航班、住宿按鈕）
 * - 下半部：每日分頁 tab（Day 1 | Day 2 | ...）
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { DndContext, DragOverlay, pointerWithin } from '@dnd-kit/core'
import { useDefaultDndSensors } from '@/lib/dnd'
import { MapPin, Map } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores'
import { useCapabilities, CAPABILITIES } from '@/lib/permissions'
import { useItineraries } from '@/data'
import { useTourDisplay } from '@/app/(main)/tours/_utils/tour-display'
import { useTourItineraryItemsByTour } from '@/app/(main)/tours/_hooks/useTourItineraryItems'
import type { Tour } from '@/stores/types'
import { getPreviewDailyData as computePreviewData } from '@/app/(main)/tours/_components/itinerary-editor/format-itinerary'
import { ResourcePanel } from '@/components/resource-panel/ResourcePanel'
import { DayRow, type DailyScheduleItem } from './itinerary/DayRow'
import { useItineraryDrag } from '../_hooks/useItineraryDrag'
import {
  AccommodationChangeDialog,
  type AccommodationChange,
} from './itinerary/AccommodationChangeDialog'
import { ResourceDetailDialog } from '@/components/resource-panel/ResourceDetailDialog'
import { ItineraryPreviewMode } from './itinerary/ItineraryPreviewMode'
import { ItineraryFlightEditor } from './itinerary/ItineraryFlightEditor'
import { ItineraryEditHeader } from './itinerary/ItineraryEditHeader'
import { useItinerarySave } from '../_hooks/useItinerarySave'
import { useItineraryPrint } from '../_hooks/useItineraryPrint'
import { useItineraryLoader } from '../_hooks/useItineraryLoader'
import { useDailyScheduleActions } from '../_hooks/useDailyScheduleActions'
import { useFlightState } from '../_hooks/useFlightState'

import { Spinner } from '@/components/ui/spinner'
const COMPONENT_LABELS = {
  ITINERARY: '行程',
} as const

interface TourItineraryTabProps {
  tour: Tour
}

// ============================================================
// Main Component
// ============================================================
export function TourItineraryTab({ tour }: TourItineraryTabProps) {
  const t = useTranslations('tour')
  const { user: currentUser } = useAuthStore()
  const { items: itineraries, refresh } = useItineraries({ all: true })
  const { items: coreItems, refresh: refreshCoreItems } = useTourItineraryItemsByTour(tour.id)
  // Day-level metadata 來自 tour_itinerary_items 的 category='day_meta' anchor row
  // （tour_itinerary_days 表已合併進 items、見 migration 20260502120000）
  const tourItineraryDays = useMemo(
    () => coreItems.filter(i => i.category === 'day_meta'),
    [coreItems]
  )

  // 權限：是否可以編輯資料庫（能管理景點資料庫）
  const { can } = useCapabilities()
  const canEditDatabase = can(CAPABILITIES.DATABASE_MANAGE_ATTRACTIONS)

  // State
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [accommodationChanges, setAccommodationChanges] = useState<AccommodationChange[]>([])
  const [showChangeDialog, setShowChangeDialog] = useState(false)
  const [attractionDetailOpen, setAttractionDetailOpen] = useState(false)
  const [clickedAttraction, setClickedAttraction] = useState<{
    id: string
    name: string
    type: 'attraction' | 'hotel' | 'restaurant'
  } | null>(null)
  const pendingSaveRef = useRef<(() => Promise<void>) | null>(null)
  const [currentItineraryId, setCurrentItineraryId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit')

  // Form data
  const [title, setTitle] = useState('')
  const [dailySchedule, setDailySchedule] = useState<DailyScheduleItem[]>([])
  const [numDays, setNumDays] = useState(5)

  // SSOT：是否為國內團 + 目的地顯示字串
  const { isDomestic, displayString: tourDestinationDisplay } = useTourDisplay(tour)

  // Calculate days: 日期差 > days_count > 預設 5
  const calculateDays = useCallback(() => {
    if (tour.departure_date && tour.return_date) {
      const start = new Date(tour.departure_date)
      const end = new Date(tour.return_date)
      return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
    }
    if (tour.days_count && tour.days_count > 0) {
      return tour.days_count
    }
    return 5
  }, [tour.departure_date, tour.return_date, tour.days_count])

  // Flight state（含多航段支援 + 搜尋，delegated to useFlightState hook）
  const {
    outboundFlights,
    setOutboundFlights,
    returnFlights,
    setReturnFlights,
    outboundFlightNumber,
    setOutboundFlightNumber,
    outboundFlightDate,
    setOutboundFlightDate,
    returnFlightNumber,
    setReturnFlightNumber,
    returnFlightDate,
    setReturnFlightDate,
    outboundSegments,
    returnSegments,
    handleSearchOutboundFlight,
    handleSearchReturnFlight,
    handleSelectOutboundSegment,
    handleSelectReturnSegment,
    clearOutboundSegments,
    clearReturnSegments,
  } = useFlightState({ tour, numDays })

  // Initialize daily schedule
  const initializeDailySchedule = useCallback((days: number) => {
    return Array.from({ length: days }, (_, i) => ({
      day: i + 1,
      route: '',
      meals: { breakfast: '', lunch: '', dinner: '' },
      accommodation: '',
      hotelBreakfast: false,
      lunchSelf: false,
      dinnerSelf: false,
      sameAsPrevious: false,
    }))
  }, [])

  // Adjust daily schedule when numDays changes
  useEffect(() => {
    setDailySchedule(prev => {
      if (prev.length === numDays) return prev
      if (numDays > prev.length) {
        const extra = Array.from({ length: numDays - prev.length }, (_, i) => ({
          day: prev.length + i + 1,
          route: '',
          meals: { breakfast: '', lunch: '', dinner: '' },
          accommodation: '',
          hotelBreakfast: false,
          lunchSelf: false,
          dinnerSelf: false,
          sameAsPrevious: false,
        }))
        return [...prev, ...extra]
      }
      return prev.slice(0, numDays).map((d, i) => ({ ...d, day: i + 1 }))
    })
  }, [numDays])

  // Load itinerary（抽到 useItineraryLoader hook）
  useItineraryLoader({
    tour,
    itineraries,
    coreItems,
    tourItineraryDays,
    calculateDays,
    initializeDailySchedule,
    setLoading,
    setCurrentItineraryId,
    setTitle,
    setOutboundFlights,
    setReturnFlights,
    setOutboundFlightDate,
    setReturnFlightDate,
    setDailySchedule,
    setNumDays,
  })

  // Daily schedule actions (delegated to useDailyScheduleActions hook)
  const { updateDaySchedule, removeAttraction, reorderAttractions, getPreviousAccommodation } =
    useDailyScheduleActions({ dailySchedule, coreItems, setDailySchedule })

  // Drag hook (extracted)
  const { activeDragName, handleDragStart, handleDragEnd } = useItineraryDrag(setDailySchedule)

  const sensors = useDefaultDndSensors()

  // 計算已排入的景點 ID 列表（用於 UI 層阻擋）
  const disabledAttractionIds = useMemo(() => {
    const ids: string[] = []
    for (const day of dailySchedule) {
      if (day.attractions) {
        for (const attraction of day.attractions) {
          ids.push(attraction.id)
        }
      }
    }
    return ids
  }, [dailySchedule])

  // Preview data
  const getPreviewDailyData = useCallback(() => {
    const scheduleForPreview = dailySchedule.map(day => ({
      ...day,
      sameAsPrevious: day.sameAsPrevious || false,
      hotelBreakfast: day.hotelBreakfast || false,
      lunchSelf: day.lunchSelf || false,
      dinnerSelf: day.dinnerSelf || false,
    }))
    return computePreviewData(scheduleForPreview, tour.departure_date || null)
  }, [dailySchedule, tour.departure_date])

  // Save (delegated to useItinerarySave hook)
  const { detectAccommodationChanges, doSave } = useItinerarySave({
    tour,
    title,
    dailySchedule,
    outboundFlights,
    returnFlights,
    outboundFlightDate,
    returnFlightDate,
    currentItineraryId,
    coreItems,
    setCurrentItineraryId,
    setSaving,
    getPreviousAccommodation,
    refresh,
    refreshCoreItems,
  })

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error(t('itineraryTabEnterTitle'))
      return
    }

    // 偵測住宿變更
    const changes = await detectAccommodationChanges()
    if (changes.length > 0) {
      setAccommodationChanges(changes)
      pendingSaveRef.current = doSave
      setShowChangeDialog(true)
      return
    }

    await doSave()
  }

  // Print（delegated to useItineraryPrint hook）
  const { printContentRef, handlePrint } = useItineraryPrint({
    title,
    tourName: tour.name || undefined,
  })

  // Compute date label for a given day index
  const getDateLabel = useCallback(
    (idx: number) => {
      if (!tour.departure_date) return ''
      const date = new Date(tour.departure_date)
      date.setDate(date.getDate() + idx)
      return `${date.getMonth() + 1}/${date.getDate()}`
    },
    [tour.departure_date]
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[500px]">
        <Spinner size="lg" className="text-muted-foreground" />
      </div>
    )
  }

  // Preview mode
  if (viewMode === 'preview') {
    const dailyData = getPreviewDailyData()
    return (
      <ItineraryPreviewMode
        title={title}
        tourDestinationDisplay={tourDestinationDisplay}
        tourDepartureDate={tour.departure_date || undefined}
        outboundFlights={outboundFlights}
        returnFlights={returnFlights}
        dailyData={dailyData}
        workspaceCode={currentUser?.workspace_code || undefined}
        printContentRef={printContentRef}
        onBackToEdit={() => setViewMode('edit')}
        onPrint={handlePrint}
      />
    )
  }

  // ============================================================
  // Edit mode — 左右分割佈局（左 60% 行程編輯，右 40% 資源庫+地圖）
  // ============================================================
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* -- 左右分割主內容區 -- */}
          <div className="flex-1 flex gap-2 overflow-hidden items-stretch">
            {/* -- 左側：行程編輯（60%）-- */}
            <div className="w-[60%] flex flex-col overflow-hidden">
              <div className="border border-border rounded-lg bg-card flex flex-col overflow-hidden flex-1">
                {/* Info row: title + days + buttons (sticky) */}
                <ItineraryEditHeader
                  title={title}
                  setTitle={setTitle}
                  numDays={numDays}
                  setNumDays={setNumDays}
                  saving={saving}
                  currentItineraryId={currentItineraryId}
                  tourId={tour.id}
                  tourDepartureDate={tour.departure_date || undefined}
                  onPreview={() => setViewMode('preview')}
                  onSave={handleSave}
                />

                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto p-4 pt-2">
                  {/* Flights row (hidden for domestic) */}
                  {!isDomestic && (
                    <ItineraryFlightEditor
                      outboundFlights={outboundFlights}
                      setOutboundFlights={setOutboundFlights}
                      outboundFlightNumber={outboundFlightNumber}
                      setOutboundFlightNumber={setOutboundFlightNumber}
                      outboundFlightDate={outboundFlightDate}
                      setOutboundFlightDate={setOutboundFlightDate}
                      outboundSegments={outboundSegments}
                      handleSearchOutboundFlight={handleSearchOutboundFlight}
                      handleSelectOutboundSegment={handleSelectOutboundSegment}
                      clearOutboundSegments={clearOutboundSegments}
                      returnFlights={returnFlights}
                      setReturnFlights={setReturnFlights}
                      returnFlightNumber={returnFlightNumber}
                      setReturnFlightNumber={setReturnFlightNumber}
                      returnFlightDate={returnFlightDate}
                      setReturnFlightDate={setReturnFlightDate}
                      returnSegments={returnSegments}
                      handleSearchReturnFlight={handleSearchReturnFlight}
                      handleSelectReturnSegment={handleSelectReturnSegment}
                      clearReturnSegments={clearReturnSegments}
                    />
                  )}

                  {/* 行程小標題 */}
                  <div className="flex items-center gap-1.5 text-xs mb-1.5 mt-1">
                    <Map size={12} className="text-morandi-gold" />
                    <span className="text-muted-foreground font-medium">
                      {COMPONENT_LABELS.ITINERARY}
                    </span>
                  </div>

                  {/* -- Daily schedule table -- */}
                  <div className="rounded-xl border border-border overflow-hidden">
                    <table className="w-full border-separate border-spacing-0 text-sm">
                      <thead className="sticky top-0 z-20 bg-card">
                        <tr className="bg-morandi-gold-header text-xs">
                          <th className="px-2 py-2 text-center w-16 font-medium border-r border-morandi-gold/20">
                            {t('itineraryTabDateHeader')}
                          </th>
                          <th className="px-2 py-2 text-left font-medium border-r border-morandi-gold/20">
                            {t('itineraryTabContent')}
                          </th>
                          <th className="px-1 py-2 text-center w-24 font-medium border-r border-morandi-gold/20">
                            {t('itineraryTabTools')}
                          </th>
                          <th className="px-1 py-2 text-center w-[120px] font-medium border-r border-morandi-gold/20">
                            {t('itineraryTabBreakfastHeader')}
                          </th>
                          <th className="px-1 py-2 text-center w-[120px] font-medium border-r border-morandi-gold/20">
                            {t('itineraryTabLunchHeader')}
                          </th>
                          <th className="px-1 py-2 text-center w-[120px] font-medium">
                            {t('itineraryTabDinnerHeader')}
                          </th>
                        </tr>
                      </thead>
                      {dailySchedule.map((day, idx) => (
                        <DayRow
                          key={idx}
                          day={day}
                          idx={idx}
                          isFirst={idx === 0}
                          isLast={idx === dailySchedule.length - 1}
                          updateDaySchedule={updateDaySchedule}
                          removeAttraction={removeAttraction}
                          reorderAttractions={reorderAttractions}
                          updateBlocks={(dayIdx, blocks) => {
                            setDailySchedule(prev => {
                              const newSchedule = [...prev]
                              newSchedule[dayIdx] = { ...newSchedule[dayIdx], blocks }
                              return newSchedule
                            })
                          }}
                          tourLocation={tourDestinationDisplay}
                          getDateLabel={getDateLabel}
                          getPreviousAccommodation={getPreviousAccommodation}
                          disabledAttractionIds={disabledAttractionIds}
                          onAttractionClick={a => {
                            setClickedAttraction({ id: a.id, name: a.name, type: 'attraction' })
                            setAttractionDetailOpen(true)
                          }}
                          onHotelClick={h => {
                            setClickedAttraction({
                              id: h.id,
                              name: h.name,
                              type: 'hotel' as const,
                            })
                            setAttractionDetailOpen(true)
                          }}
                        />
                      ))}
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* -- 右側：資源庫 + 地圖（40%）-- */}
            <div className="w-[40%] flex flex-col border border-border rounded-lg bg-card overflow-hidden">
              <ResourcePanel
                className="flex-1 overflow-hidden"
                countryId={tour.country_id || ''}
                locationName={tourDestinationDisplay}
                tourId={tour.id}
                tourCode={tour.code || ''}
                canEditDatabase={canEditDatabase}
                coreItems={coreItems}
                onOverrideSave={refreshCoreItems}
              />
            </div>
          </div>
          {/* 左右分割結束 */}

          {/* 拖拽覆蓋層 */}
          <DragOverlay>
            {activeDragName ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-morandi-gold bg-card shadow-lg text-sm font-medium">
                <MapPin size={14} className="text-morandi-gold" />
                {activeDragName}
              </div>
            ) : null}
          </DragOverlay>

          {/* 住宿變更確認 Dialog */}
          <AccommodationChangeDialog
            open={showChangeDialog}
            changes={accommodationChanges}
            onConfirm={() => {
              // 防連點：pendingSaveRef 在第一次呼叫後設 null、第二次點不會重複跑
              if (!pendingSaveRef.current) return
              setShowChangeDialog(false)
              pendingSaveRef.current()
              pendingSaveRef.current = null
            }}
            onCancel={() => {
              setShowChangeDialog(false)
              pendingSaveRef.current = null
            }}
            loading={saving}
          />

          {/* 景點詳情 Dialog */}
          <ResourceDetailDialog
            open={attractionDetailOpen}
            onOpenChange={setAttractionDetailOpen}
            resource={clickedAttraction}
            canEditDatabase
          />
        </div>
      </DndContext>
    </div>
  )
}
