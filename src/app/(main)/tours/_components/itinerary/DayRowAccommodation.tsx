'use client'

import { useTranslations } from 'next-intl'
import { X } from 'lucide-react'
import { EmptyValue } from '@/components/ui/empty-value'
import { DroppableZone } from './DroppableZone'
import type { DailyScheduleItem } from './DayRow'

// 跟 DayRow 統一：cell 之間用 table-divider 短直線、row 之間用 border-b
const CELL = 'border-b border-border/40 table-divider'
const CELL_LAST = 'border-b border-border/40'

// ============================================
// 住宿行（酒店拖拽 + 續住 checkbox）
// 只在非最後一天顯示
// ============================================

interface DayRowAccommodationProps {
  day: DailyScheduleItem
  idx: number
  updateDaySchedule: (index: number, field: string, value: string | boolean | undefined) => void
  getPreviousAccommodation: (index: number) => string
  onHotelClick?: (hotel: { id: string; name: string }) => void
}

export function DayRowAccommodation({
  day,
  idx,
  updateDaySchedule,
  getPreviousAccommodation,
  onHotelClick,
}: DayRowAccommodationProps) {
  const t = useTranslations('tour')
  return (
    <tr className={idx % 2 === 1 ? 'bg-muted/5' : ''}>
      <td
        className={`px-2 py-0 ${CELL} align-middle text-center text-xs text-muted-foreground font-medium bg-card`}
      >
        飯店
      </td>
      <td colSpan={4} className={`px-0 py-0 ${CELL} align-middle`}>
        <DroppableZone id={`hotel-drop-${idx}`} acceptType="hotel">
          {day.sameAsPrevious ? (
            <div className="h-7 flex items-center justify-center px-2 text-sm text-muted-foreground">
              {t('dayRowContinueStayPrefix')}
              {getPreviousAccommodation(idx) || <EmptyValue />})
            </div>
          ) : day.accommodation ? (
            <div className="h-7 flex items-center justify-center px-2">
              <div
                className={`inline-flex items-center gap-1 bg-status-info/10 text-status-info border border-status-info/30 rounded-full px-2 py-0.5 text-xs ${onHotelClick && day.accommodationId ? 'cursor-pointer hover:bg-status-info/20 transition-colors' : ''}`}
                onClick={
                  onHotelClick && day.accommodationId
                    ? () => onHotelClick({ id: day.accommodationId!, name: day.accommodation })
                    : undefined
                }
              >
                <span>{day.accommodation}</span>
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation()
                    updateDaySchedule(idx, 'accommodation', '')
                  }}
                  className="hover:text-destructive"
                >
                  <X size={10} />
                </button>
              </div>
            </div>
          ) : (
            <div className="h-7 flex items-center justify-center px-2 text-sm text-muted-foreground/70">
              {t('dayRowDragHotelHere')}
            </div>
          )}
        </DroppableZone>
      </td>
      <td className={`px-1 py-0 ${CELL_LAST} align-middle text-center`}>
        {idx > 0 && (
          <label className="flex items-center justify-center gap-1 text-[0.588rem] text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={!!day.sameAsPrevious}
              onChange={() => updateDaySchedule(idx, 'sameAsPrevious', !day.sameAsPrevious)}
              className="rounded border-morandi-secondary w-3 h-3"
            />
            {t('dayRowContinueStay')}
          </label>
        )}
      </td>
    </tr>
  )
}
