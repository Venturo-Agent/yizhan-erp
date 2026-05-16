'use client'
import React from 'react'
import { getBrandTagline } from '@/lib/tenant'
import { TourFormData, CoverStyleType } from '../../types'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toHalfWidth } from '@/lib/utils/text'
import { RichTextInput } from '@/components/ui/rich-text-input'
import { CalendarIcon, Loader2 } from 'lucide-react'
import { COMP_EDITOR_LABELS } from '../../../constants/labels'

const COMPONENT_LABELS = {
  PER_PERSON: '/人',
  STARTING: '起',
  PER_PERSON_STARTING: '/人起',
  HIDDEN: '(不顯示)',
} as const

interface CoverInfoFormProps {
  data: TourFormData
  // SSOT 由 tours.country_id / airport_code 負責、此表單不露出國家 / 城市 / 機場欄位
  updateField: (field: string, value: unknown) => void
  onChange: (data: TourFormData) => void
  coverStyleOptions: Array<{
    value: CoverStyleType
    label: string
    description: string
    color: string
    previewImage?: string
  }>
  onCoverStyleChange: (style: CoverStyleType) => void
  templatesLoading: boolean
}

export function CoverInfoForm({
  data,
  updateField,
  coverStyleOptions,
  onCoverStyleChange,
  templatesLoading,
}: CoverInfoFormProps) {
  return (
    <div className="space-y-4">
      {/* 主題風格選擇器 */}
      <div>
        <label className="block text-sm font-medium text-morandi-primary mb-2">
          {COMP_EDITOR_LABELS.LABEL_1339}
        </label>
        {templatesLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-morandi-gold" />
          </div>
        ) : (
          <Select
            value={data.coverStyle || 'original'}
            onValueChange={value => onCoverStyleChange(value as CoverStyleType)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={COMP_EDITOR_LABELS.選擇主題風格} />
            </SelectTrigger>
            <SelectContent>
              {coverStyleOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* 基本資訊 */}
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-morandi-primary mb-1">
            {COMP_EDITOR_LABELS.LABEL_1694}
            <span className="ml-2 text-xs text-morandi-secondary font-normal">
              {COMP_EDITOR_LABELS.LABEL_4233}
            </span>
          </label>
          <RichTextInput
            value={data.tagline || ''}
            onChange={value => updateField('tagline', value)}
            placeholder={getBrandTagline('秋季精選')}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-morandi-primary mb-1">
              {COMP_EDITOR_LABELS.LABEL_147}
            </label>
            <RichTextInput
              value={data.title || ''}
              onChange={value => updateField('title', value)}
              placeholder={COMP_EDITOR_LABELS.漫遊福岡}
              singleLine={false}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-morandi-primary mb-1">
              {COMP_EDITOR_LABELS.副標題}
            </label>
            <RichTextInput
              value={data.subtitle || ''}
              onChange={value => updateField('subtitle', value)}
              placeholder={data.coverStyle === 'art' ? 'Odyssey' : COMP_EDITOR_LABELS.半自由行}
              singleLine={false}
            />
            {data.coverStyle === 'art' && !data.subtitle && (
              <p className="text-xs text-morandi-secondary mt-1">{COMP_EDITOR_LABELS.LABEL_463}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-morandi-primary mb-1">
            {COMP_EDITOR_LABELS.LABEL_3951}
          </label>
          <RichTextInput
            value={data.description || ''}
            onChange={value => updateField('description', value)}
            placeholder={COMP_EDITOR_LABELS._2日市區自由活動_保證入住溫泉飯店_柳川遊船_阿蘇火山}
            singleLine={false}
          />
        </div>

        {/* SSOT：國家/機場代碼是 tours 的屬性（country_id + airport_code），
            屬於「編輯旅遊團基本資料」對話框的職責；展示行程不再露出這兩個欄位，
            避免使用者誤以為這裡可以改。封面圖片庫底層仍然以 tour.airport_code
            自動載入該機場的圖庫照片，使用者也可直接上傳照片。 */}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-morandi-primary mb-1">
              {COMP_EDITOR_LABELS.LABEL_4513}
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="soft-gold"
                  className={cn(
                    'w-full h-9 justify-start text-left font-normal',
                    !data.departureDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {data.departureDate || COMP_EDITOR_LABELS.選擇日期}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto border-0 bg-transparent p-0 shadow-none" align="start">
                <Calendar
                  mode="single"
                  selected={
                    data.departureDate
                      ? new Date(data.departureDate.replace(/\//g, '-'))
                      : undefined
                  }
                  onSelect={date => {
                    if (date && date instanceof Date) {
                      const formatted = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
                      updateField('departureDate', formatted)
                    }
                  }}
                  defaultMonth={
                    data.departureDate
                      ? new Date(data.departureDate.replace(/\//g, '-'))
                      : new Date()
                  }
                />
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <label className="block text-sm font-medium text-morandi-primary mb-1">
              {COMP_EDITOR_LABELS.LABEL_1470}
            </label>
            <Input
              type="text"
              value={data.tourCode || ''}
              onChange={e => updateField('tourCode', e.target.value)}
              placeholder="25JFO21CIG"
              className="h-9"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-morandi-primary mb-1">
              {COMP_EDITOR_LABELS.價格}
            </label>
            <Input
              type="text"
              value={data.price || ''}
              onChange={e => {
                const halfWidthValue = toHalfWidth(e.target.value)
                const rawValue = halfWidthValue.replace(/[^\d]/g, '')
                const formattedValue = rawValue ? Number(rawValue).toLocaleString('en-US') : ''
                updateField('price', formattedValue)
              }}
              placeholder="39,800"
              className="h-9"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-morandi-primary mb-1">
              {COMP_EDITOR_LABELS.LABEL_9062}
            </label>
            <Select
              value={data.priceNote || COMP_EDITOR_LABELS.人}
              onValueChange={value => updateField('priceNote', value)}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder={COMP_EDITOR_LABELS.選擇單位} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={COMP_EDITOR_LABELS.人}>{COMPONENT_LABELS.PER_PERSON}</SelectItem>
                <SelectItem value={COMP_EDITOR_LABELS.起}>{COMPONENT_LABELS.STARTING}</SelectItem>
                <SelectItem value={COMP_EDITOR_LABELS.人起}>{COMPONENT_LABELS.PER_PERSON_STARTING}</SelectItem>
                <SelectItem value="__hidden__">{COMPONENT_LABELS.HIDDEN}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  )
}

