'use client'

import { X, CheckSquare } from 'lucide-react'
import { FormDialog } from '@/components/dialog/form-dialog'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AddEventDialogState, NewEventForm } from '../_types'
import { useTranslations } from 'next-intl'

interface AddEventDialogProps {
  dialog: AddEventDialogState
  newEvent: NewEventForm
  onNewEventChange: (event: NewEventForm) => void
  onDialogChange: (dialog: AddEventDialogState) => void
  onSubmit: () => void
  onClose: () => void
}

// 全形轉半形
const toHalfWidth = (str: string): string => {
  return str
    .replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
    .replace(/[－]/g, '-')
    .replace(/[～]/g, '~')
    .replace(/[：]/g, ':')
}

// 格式化單一時間（0800 → 08:00）
const formatSingleTime = (value: string): string => {
  const normalized = toHalfWidth(value)
  const digits = normalized.replace(/[^\d]/g, '')
  if (!digits) return ''

  if (digits.length === 4) {
    return `${digits.slice(0, 2)}:${digits.slice(2, 4)}`
  }
  if (digits.length === 3) {
    return `0${digits[0]}:${digits.slice(1, 3)}`
  }
  if (digits.length === 2) {
    return `${digits}:00`
  }
  if (digits.length === 1) {
    return `0${digits}:00`
  }
  return normalized
}

// 解析時間範圍（0800-1700 → start: 08:00, end: 17:00）
const parseTimeRange = (value: string): { start: string; end: string } => {
  if (!value) return { start: '', end: '' }

  const normalized = toHalfWidth(value)
  // 包含 - 或 ~ 視為範圍輸入
  if (normalized.includes('-') || normalized.includes('~')) {
    const parts = normalized.split(/[-~]/)
    if (parts.length === 2) {
      return {
        start: formatSingleTime(parts[0].trim()),
        end: formatSingleTime(parts[1].trim()),
      }
    }
  }

  return {
    start: formatSingleTime(value),
    end: '',
  }
}

// 輸入框樣式
const inputClassName =
  'w-full px-4 py-2.5 rounded-lg border border-morandi-container bg-card text-[var(--morandi-primary)] placeholder:text-[var(--morandi-primary)]/30 focus:outline-none focus:ring-1 focus:ring-morandi-gold focus:border-morandi-container transition-shadow text-sm shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]'

/**
 * 2026-05-16 QDF R69：遷移到 FormDialog SSOT
 * 對齊 07-ui-blueprint R1（表單型走 FormDialog）+ R4（footer 順序取消左 / 主操作右）
 */
export function AddEventDialog({
  dialog,
  newEvent,
  onNewEventChange,
  onDialogChange,
  onSubmit,
  onClose,
}: AddEventDialogProps) {
  const t = useTranslations('calendarPage')
  const handleSubmit = () => {
    if (newEvent.title.trim()) onSubmit()
  }

  const customFooter = (
    <div className="flex justify-end gap-3">
      {/* R4: 取消左、主操作右 */}
      <Button type="button" variant="outline" onClick={onClose}>
        <X className="h-4 w-4 mr-1" />
        {t('cancel')}
      </Button>
      <Button
        type="button"
        variant="morandi-gold"
        onClick={handleSubmit}
        disabled={!newEvent.title.trim()}
      >
        <CheckSquare size="1em" />
        {t('addEnter')}
      </Button>
    </div>
  )

  return (
    <FormDialog
      open={dialog.open}
      onOpenChange={open => !open && onClose()}
      title={t('addDialogTitle')}
      maxWidth="2xl"
      footer={customFooter}
      loading={false}
    >
      <div className="space-y-6">
        {/* 日期欄位 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-[var(--morandi-primary)]/80">
              {t('startDate')}
            </label>
            <DatePicker
              value={dialog.selectedDate}
              onChange={date => onDialogChange({ ...dialog, selectedDate: date })}
              placeholder={t('placeholderSelectDate')}
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-[var(--morandi-primary)]/80">
              {t('endDateOptional')}
            </label>
            <DatePicker
              value={newEvent.end_date}
              onChange={date => onNewEventChange({ ...newEvent, end_date: date })}
              placeholder={t('placeholderSelectDate')}
            />
          </div>
        </div>

        {/* 標題 */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-[var(--morandi-primary)]/80">
            {t('titleLabel')}
          </label>
          <input
            type="text"
            value={newEvent.title}
            onChange={e => onNewEventChange({ ...newEvent, title: e.target.value })}
            placeholder={t('placeholderEnterTitle')}
            className={inputClassName}
          />
        </div>

        {/* 類型與時間 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-[var(--morandi-primary)]/80">
              {t('eventType')}
            </label>
            <Select
              value={newEvent.visibility}
              onValueChange={(value: 'personal' | 'company') =>
                onNewEventChange({
                  ...newEvent,
                  visibility: value,
                })
              }
            >
              <SelectTrigger className={inputClassName}>
                <SelectValue placeholder={t('placeholderSelectEventType')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="personal">{t('personalCalendar')}</SelectItem>
                <SelectItem value="company">{t('companyCalendar')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-[var(--morandi-primary)]/80">
              {t('startTimeOptional')}
            </label>
            <input
              type="text"
              value={newEvent.start_time}
              onChange={e => onNewEventChange({ ...newEvent, start_time: e.target.value })}
              onBlur={e => {
                const { start, end } = parseTimeRange(e.target.value)
                onNewEventChange({
                  ...newEvent,
                  start_time: start,
                  end_time: end || newEvent.end_time,
                })
              }}
              placeholder={t('placeholderTimeRange')}
              className={inputClassName}
            />
          </div>
        </div>

        {/* 說明 */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-[var(--morandi-primary)]/80">
            {t('descriptionOptional')}
          </label>
          <textarea
            value={newEvent.description}
            onChange={e => onNewEventChange({ ...newEvent, description: e.target.value })}
            placeholder={t('placeholderEnterDescription')}
            rows={3}
            className={`${inputClassName} resize-none`}
          />
        </div>
      </div>
    </FormDialog>
  )
}
