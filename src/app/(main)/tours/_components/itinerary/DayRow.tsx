'use client'

import React from 'react'
import { useTranslations } from 'next-intl'
import { MapPin, X } from 'lucide-react'
import { DroppableZone } from './DroppableZone'
import { MealCell } from './MealCell'
import { DayRowAccommodation } from './DayRowAccommodation'
import { DayRowNote } from './DayRowNote'
import { useRestaurants } from '@/data'
import type { RestaurantItem } from './MealCombobox'

// ============================================
// DayRow — 日行程主列（含三餐欄）
// 景點、住宿、備註行抽為子元件
// ============================================

type ItineraryBlock =
  | { type: 'text'; content: string }
  | { type: 'attraction'; id: string; name: string; verified?: boolean }

export interface DailyScheduleItem {
  day: number
  route: string
  meals: { breakfast: string; lunch: string; dinner: string }
  accommodation: string
  hotelBreakfast?: boolean
  breakfastSelf?: boolean
  breakfastAirline?: boolean
  lunchSelf?: boolean
  dinnerSelf?: boolean
  lunchAirline?: boolean
  dinnerAirline?: boolean
  sameAsPrevious?: boolean
  attractions?: { id: string; name: string; verified?: boolean }[]
  blocks?: ItineraryBlock[]
  note?: string
  accommodationId?: string
  mealIds?: {
    breakfast?: string
    lunch?: string
    dinner?: string
  }
}

type MealKey = 'breakfast' | 'lunch' | 'dinner'

interface DayRowProps {
  day: DailyScheduleItem
  idx: number
  isFirst: boolean
  isLast: boolean
  updateDaySchedule: (index: number, field: string, value: string | boolean | undefined) => void
  removeAttraction: (dayIdx: number, attractionId: string) => void
  reorderAttractions: (
    dayIdx: number,
    newOrder: { id: string; name: string; verified?: boolean }[]
  ) => void
  updateBlocks?: (dayIdx: number, blocks: ItineraryBlock[]) => void
  tourLocation: string
  getDateLabel: (idx: number) => string
  getPreviousAccommodation: (index: number) => string
  disabledAttractionIds?: string[]
  onAttractionClick?: (attraction: { id: string; name: string; verified?: boolean }) => void
  onHotelClick?: (hotel: { id: string; name: string }) => void
}

// Excel 風：cell 之間用 .table-divider（短直線、不到頂底）
// row 之間用 border-b、最後一欄不加 divider
const CELL = 'border-b border-border/40 table-divider'
const CELL_LAST = 'border-b border-border/40'
const CELL_NO_B = 'table-divider'
const CELL_LAST_NO_B = ''

export function DayRow({
  day,
  idx,
  isFirst,
  isLast,
  updateDaySchedule,
  removeAttraction,
  reorderAttractions,
  updateBlocks: _updateBlocks,
  tourLocation: _tourLocation,
  getDateLabel,
  getPreviousAccommodation,
  disabledAttractionIds: _disabledAttractionIds = [],
  onAttractionClick,
  onHotelClick,
}: DayRowProps) {
  const t = useTranslations('tour')
  // 最後一天的最後一行不需要底線（外框已有）
  const hasNote = day.note !== undefined
  const mainRowIsTableBottom = isLast && !hasNote
  const noteRowIsTableBottom = isLast && hasNote
  const c = mainRowIsTableBottom ? CELL_NO_B : CELL
  const cLast = mainRowIsTableBottom ? CELL_LAST_NO_B : CELL_LAST

  const routeInputRef = React.useRef<HTMLInputElement>(null)

  // 餐廳清單（Combobox 搜尋資料）
  const { items: restaurants } = useRestaurants({ all: true })
  const restaurantOptions = (restaurants || []) as RestaurantItem[]

  // 選餐廳：寫 meals.xxx + mealIds.xxx，並清掉該餐的 preset flags
  const handlePickRestaurant = React.useCallback(
    (mealKey: MealKey, r: { id: string; name: string }) => {
      updateDaySchedule(idx, `meals.${mealKey}`, r.name)
      updateDaySchedule(idx, `mealIds.${mealKey}`, r.id)
      if (mealKey === 'breakfast') {
        updateDaySchedule(idx, 'hotelBreakfast', false)
        updateDaySchedule(idx, 'breakfastSelf', false)
        updateDaySchedule(idx, 'breakfastAirline', false)
      } else if (mealKey === 'lunch') {
        updateDaySchedule(idx, 'lunchSelf', false)
        updateDaySchedule(idx, 'lunchAirline', false)
      } else {
        updateDaySchedule(idx, 'dinnerSelf', false)
        updateDaySchedule(idx, 'dinnerAirline', false)
      }
    },
    [idx, updateDaySchedule]
  )

  // 純文字輸入：寫 meals.xxx，清 mealIds.xxx
  const handlePlainTextMeal = React.useCallback(
    (mealKey: MealKey, text: string) => {
      updateDaySchedule(idx, `meals.${mealKey}`, text)
      updateDaySchedule(idx, `mealIds.${mealKey}`, '')
    },
    [idx, updateDaySchedule]
  )

  // 清除某餐的文字與 id
  const handleClearMeal = React.useCallback(
    (mealKey: MealKey) => {
      updateDaySchedule(idx, `meals.${mealKey}`, '')
      updateDaySchedule(idx, `mealIds.${mealKey}`, '')
    },
    [idx, updateDaySchedule]
  )

  // 勾一個 preset：互斥清掉其他
  const handleTogglePreset = React.useCallback(
    (mealKey: 'lunch' | 'dinner', which: 'self' | 'airline') => {
      const isSelf = which === 'self'
      const selfKey = `${mealKey}Self` as const
      const airlineKey = `${mealKey}Airline` as const
      const currentlyOn = isSelf ? !!day[selfKey] : !!day[airlineKey]
      const next = !currentlyOn
      updateDaySchedule(idx, selfKey, isSelf ? next : false)
      updateDaySchedule(idx, airlineKey, isSelf ? false : next)
      updateDaySchedule(idx, `meals.${mealKey}`, '')
      updateDaySchedule(idx, `mealIds.${mealKey}`, '')
    },
    [idx, day, updateDaySchedule]
  )

  const handleToggleHotelBreakfast = React.useCallback(() => {
    const next = !day.hotelBreakfast
    updateDaySchedule(idx, 'hotelBreakfast', next)
    updateDaySchedule(idx, 'breakfastSelf', false)
    updateDaySchedule(idx, 'breakfastAirline', false)
    updateDaySchedule(idx, 'meals.breakfast', '')
    updateDaySchedule(idx, 'mealIds.breakfast', '')
  }, [idx, day.hotelBreakfast, updateDaySchedule])

  const handleToggleBreakfastSelf = React.useCallback(() => {
    const next = !day.breakfastSelf
    updateDaySchedule(idx, 'breakfastSelf', next)
    updateDaySchedule(idx, 'hotelBreakfast', false)
    updateDaySchedule(idx, 'breakfastAirline', false)
    updateDaySchedule(idx, 'meals.breakfast', '')
    updateDaySchedule(idx, 'mealIds.breakfast', '')
  }, [idx, day.breakfastSelf, updateDaySchedule])

  const handleToggleBreakfastAirline = React.useCallback(() => {
    const next = !day.breakfastAirline
    updateDaySchedule(idx, 'breakfastAirline', next)
    updateDaySchedule(idx, 'hotelBreakfast', false)
    updateDaySchedule(idx, 'breakfastSelf', false)
    updateDaySchedule(idx, 'meals.breakfast', '')
    updateDaySchedule(idx, 'mealIds.breakfast', '')
  }, [idx, day.breakfastAirline, updateDaySchedule])

  // 插入景點：名字插到游標位置 + 加到 attractions 列表
  const _handleInsertAttraction = React.useCallback(
    (attraction: { id: string; name: string }) => {
      const existing = day.attractions || []
      if (existing.some(a => a.id === attraction.id)) return
      const newAttractions = [...existing, attraction]
      reorderAttractions(idx, newAttractions)

      const input = routeInputRef.current
      const currentRoute = day.route || ''
      const insertText = attraction.name

      if (input) {
        const pos = input.selectionStart || currentRoute.length
        const before = currentRoute.slice(0, pos)
        const after = currentRoute.slice(pos)
        const separator = before && !before.endsWith(' → ') && !before.endsWith(' ') ? ' → ' : ''
        const newRoute = before + separator + insertText + after
        updateDaySchedule(idx, 'route', newRoute)
      } else {
        const separator = currentRoute ? ' → ' : ''
        updateDaySchedule(idx, 'route', currentRoute + separator + insertText)
      }
    },
    [day.attractions, day.route, idx, reorderAttractions, updateDaySchedule]
  )

  const handleRouteChange = React.useCallback(
    (value: string) => {
      updateDaySchedule(idx, 'route', value)
    },
    [idx, updateDaySchedule]
  )

  const handleRemoveAttraction = React.useCallback(
    (attractionId: string) => {
      const attraction = (day.attractions || []).find(a => a.id === attractionId)
      if (!attraction) return
      removeAttraction(idx, attractionId)

      const name = attraction.name
      let newRoute = day.route || ''
      newRoute = newRoute.replace(` → ${name}`, '')
      newRoute = newRoute.replace(`${name} → `, '')
      newRoute = newRoute.replace(name, '')
      newRoute = newRoute.trim()
      if (newRoute !== day.route) {
        updateDaySchedule(idx, 'route', newRoute)
      }
    },
    [day.attractions, day.route, idx, removeAttraction, updateDaySchedule]
  )

  const mealCellProps = {
    day,
    idx,
    isFirst,
    onToggleBreakfastAirline: handleToggleBreakfastAirline,
    restaurantOptions,
    onPick: handlePickRestaurant,
    onPlainText: handlePlainTextMeal,
    onClear: handleClearMeal,
    onTogglePreset: handleTogglePreset,
    onToggleHotelBreakfast: handleToggleHotelBreakfast,
    onToggleBreakfastSelf: handleToggleBreakfastSelf,
  }

  return (
    <tbody>
      <tr className={`${idx % 2 === 1 ? 'bg-muted/5' : ''} group`}>
        {/* Day + date */}
        <td className={`px-2 py-1 ${c} align-middle text-center`}>
          <div className="font-semibold text-muted-foreground text-xs">Day {day.day}</div>
          {getDateLabel(idx) && (
            <div className="text-xs text-muted-foreground">{getDateLabel(idx)}</div>
          )}
        </td>
        {/* Route — 文字輸入 + 景點標籤在下排 */}
        <td className={`px-0 py-0 ${c} align-middle`}>
          <DroppableZone id={`attraction-drop-${idx}`} acceptType="attraction">
            <div className="flex flex-col">
              <div className="flex items-center">
                <input
                  ref={routeInputRef}
                  type="text"
                  value={day.route || ''}
                  onChange={e => handleRouteChange(e.target.value)}
                  placeholder={`${t('itineraryDayTitle')}（${t('itineraryDragAttractionHere')}）`}
                  className="h-8 flex-1 text-sm border-0 shadow-none focus-visible:ring-1 focus-visible:ring-morandi-gold/30 rounded px-2 bg-transparent outline-none min-w-0 placeholder:text-muted-foreground/70"
                />
              </div>
              {/* 景點標籤列 */}
              {(day.attractions?.length ?? 0) > 0 && (
                <div className="flex flex-wrap items-center gap-1 px-2 pb-1">
                  {(day.attractions || []).map(a => (
                    <span
                      key={a.id}
                      className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[0.588rem] whitespace-nowrap ${
                        a.verified === false
                          ? 'bg-morandi-gold/10 text-morandi-gold border border-morandi-gold/30'
                          : 'bg-morandi-gold/10 text-morandi-gold'
                      } ${onAttractionClick ? 'cursor-pointer hover:bg-morandi-gold/20 transition-colors' : ''}`}
                      title={a.verified === false ? '資料待完善' : undefined}
                      onClick={onAttractionClick ? () => onAttractionClick(a) : undefined}
                    >
                      {a.verified === false && <span className="mr-0.5">⚠</span>}
                      <MapPin size={8} />
                      <span>{a.name}</span>
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation()
                          handleRemoveAttraction(a.id)
                        }}
                        className="hover:text-destructive ml-0.5"
                      >
                        <X size={8} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </DroppableZone>
        </td>
        {/* PS 入口 — 緊鄰早餐左側的一小格、toggle 備註行顯示/隱藏 */}
        <td className={`px-1 py-0 ${c} align-middle`}>
          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={() => {
                const hasNoteNow = day.note !== undefined
                updateDaySchedule(idx, 'note', hasNoteNow ? undefined : '')
              }}
              className={`px-1 py-0.5 text-[0.588rem] font-medium rounded ${day.note !== undefined ? 'bg-morandi-gold/20 text-morandi-gold' : 'hover:bg-morandi-gold/20 text-muted-foreground'}`}
              title={t('noteLabel')}
            >
              PS
            </button>
          </div>
        </td>
        {/* 三餐欄 — 各自用 MealCell */}
        <MealCell mealKey="breakfast" cellClass={c} {...mealCellProps} />
        <MealCell mealKey="lunch" cellClass={c} {...mealCellProps} />
        <MealCell mealKey="dinner" cellClass={cLast} {...mealCellProps} />
      </tr>
      {/* 住宿行（非最後一天才顯示） */}
      {!isLast && (
        <DayRowAccommodation
          day={day}
          idx={idx}
          updateDaySchedule={updateDaySchedule}
          getPreviousAccommodation={getPreviousAccommodation}
          onHotelClick={onHotelClick}
        />
      )}
      {/* 備註行 */}
      {day.note !== undefined && (
        <DayRowNote
          note={day.note}
          idx={idx}
          isTableBottom={noteRowIsTableBottom}
          updateDaySchedule={updateDaySchedule}
        />
      )}
    </tbody>
  )
}
