'use client'

import React from 'react'
import { Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { DailyItinerary, TourFormData } from '../../types'
import { COMP_EDITOR_LABELS } from '../../../constants/labels'

interface AccommodationSectionProps {
  day: DailyItinerary
  dayIndex: number
  data: TourFormData
  updateDailyItinerary: (
    index: number,
    field: string | Record<string, unknown>,
    value?: unknown
  ) => void
  onOpenHotelSelector: (dayIndex: number) => void
  isLockedByQuote?: boolean // 有關聯報價單時鎖定飯店名稱
}

export function AccommodationSection({
  day,
  dayIndex,
  data,
  updateDailyItinerary,
  onOpenHotelSelector,
  isLockedByQuote = false,
}: AccommodationSectionProps) {
  // 飯店名稱鎖定：有報價單 或 續住時
  const isNameLocked = isLockedByQuote || day.isSameAccommodation
  // 續住時星級和連結也不需要編輯（跟前一天一樣）
  const isDetailLocked = day.isSameAccommodation

  return (
    <div className="space-y-2">
      {/* 續住勾選（第二天以後才顯示） — 永遠可操作 */}
      {dayIndex > 0 && (
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => {
            const newChecked = !day.isSameAccommodation
            if (newChecked) {
              // 勾選續住：一次性複製前一天的住宿資料
              const prevDay = data.dailyItinerary[dayIndex - 1]
              updateDailyItinerary(dayIndex, {
                isSameAccommodation: true,
                accommodation: prevDay?.accommodation || '',
                accommodationUrl: prevDay?.accommodationUrl || '',
                accommodationRating: prevDay?.accommodationRating ?? 5,
              })
            } else {
              // 取消續住：保留飯店名稱（報價單鎖定時），清空星級和連結讓用戶重填
              if (isLockedByQuote) {
                updateDailyItinerary(dayIndex, {
                  isSameAccommodation: false,
                  accommodationUrl: '',
                  accommodationRating: 5,
                })
              } else {
                updateDailyItinerary(dayIndex, 'isSameAccommodation', false)
              }
            }
          }}
        >
          <Checkbox checked={day.isSameAccommodation || false} />
          <span className="text-sm text-morandi-primary">
            {COMP_EDITOR_LABELS.LABEL_3005}
            {data.dailyItinerary[dayIndex - 1]?.accommodation && (
              <span className="text-morandi-gold ml-1">
                （{data.dailyItinerary[dayIndex - 1].accommodation}）
              </span>
            )}
          </span>
        </div>
      )}

      {/* 續住時不顯示住宿欄位 */}
      {!day.isSameAccommodation && (
        <>
          {/* 住宿標題與飯店庫按鈕 */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-morandi-primary flex items-center gap-2">
              <Building2 size="0.875em" />
              {COMP_EDITOR_LABELS.住宿}
            </label>
            {/* 有報價單時隱藏飯店選擇按鈕（飯店由報價單決定） */}
            {!isLockedByQuote && (
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={() => onOpenHotelSelector(dayIndex)}
                  size="xs"
                  variant="soft-gold"
                >
                  {COMP_EDITOR_LABELS.SELECT_7853}
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    updateDailyItinerary(dayIndex, 'accommodation', '')
                    updateDailyItinerary(dayIndex, 'accommodationUrl', '')
                    updateDailyItinerary(dayIndex, 'accommodationRating', 5)
                    setTimeout(() => {
                      const input = document.querySelector(
                        `#accommodation-input-${dayIndex}`
                      ) as HTMLInputElement
                      input?.focus()
                    }, 0)
                  }}
                  size="xs"
                  variant="secondary"
                >
                  + 手動新增
                </Button>
              </div>
            )}
          </div>

          {/* 住宿輸入欄位 */}
          <div className="flex flex-wrap gap-3">
            {/* 飯店名稱：有報價單時鎖定 */}
            <div className={`flex-1 min-w-[12.5rem] ${isNameLocked ? 'opacity-60' : ''}`}>
              <label className="block text-xs font-medium text-morandi-primary mb-1">
                {COMP_EDITOR_LABELS.LABEL_5732}
              </label>
              <Input
                id={`accommodation-input-${dayIndex}`}
                type="text"
                value={day.accommodation || ''}
                onChange={e => updateDailyItinerary(dayIndex, 'accommodation', e.target.value)}
                disabled={isNameLocked}
                className="h-8 text-sm"
                placeholder={COMP_EDITOR_LABELS.飯店名稱}
              />
            </div>
            {/* 星級：永遠可編輯（行程表階段填入） */}
            <div className="w-24">
              <label className="block text-xs font-medium text-morandi-primary mb-1">
                {COMP_EDITOR_LABELS.LABEL_5000}
              </label>
              <Select
                value={String(day.accommodationRating ?? 5)}
                onValueChange={val => {
                  updateDailyItinerary(
                    dayIndex,
                    'accommodationRating',
                    val === '0' ? 0 : Number(val)
                  )
                }}
                disabled={isDetailLocked}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5{COMP_EDITOR_LABELS.STAR_SUFFIX}</SelectItem>
                  <SelectItem value="4">4{COMP_EDITOR_LABELS.STAR_SUFFIX}</SelectItem>
                  <SelectItem value="3">3{COMP_EDITOR_LABELS.STAR_SUFFIX}</SelectItem>
                  <SelectItem value="2">2{COMP_EDITOR_LABELS.STAR_SUFFIX}</SelectItem>
                  <SelectItem value="1">1{COMP_EDITOR_LABELS.STAR_SUFFIX}</SelectItem>
                  <SelectItem value="0">{COMP_EDITOR_LABELS.LABEL_6456}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* 飯店連結：永遠可編輯（行程表階段填入） */}
            <div className="flex-1 min-w-[11.25rem]">
              <label className="block text-xs font-medium text-morandi-primary mb-1">
                {COMP_EDITOR_LABELS.LABEL_5538}
              </label>
              <Input
                type="url"
                value={day.accommodationUrl || ''}
                onChange={e => updateDailyItinerary(dayIndex, 'accommodationUrl', e.target.value)}
                disabled={isDetailLocked}
                className="h-8 text-sm"
                placeholder="https://..."
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
