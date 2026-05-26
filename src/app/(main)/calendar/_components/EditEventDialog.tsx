'use client'

import { Input } from '@/components/ui/input'
import { FormDialog } from '@/components/dialog'
import { DatePicker } from '@/components/ui/date-picker'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EditEventDialogState } from '../_types'
import { useTranslations } from 'next-intl'

interface EditEventDialogProps {
  dialog: EditEventDialogState
  onDialogChange: (dialog: EditEventDialogState) => void
  onSubmit: () => void
  onClose: () => void
  /** 提交中、防連點（FormDialog 會 disable submit button + 顯示「處理中...」） */
  loading?: boolean
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

  let hour = 0
  let minute = 0

  if (digits.length === 1) {
    hour = parseInt(digits, 10)
  } else if (digits.length === 2) {
    hour = parseInt(digits, 10)
  } else if (digits.length === 3) {
    hour = parseInt(digits.slice(0, 1), 10)
    minute = parseInt(digits.slice(1), 10)
  } else if (digits.length >= 4) {
    hour = parseInt(digits.slice(0, 2), 10)
    minute = parseInt(digits.slice(2, 4), 10)
  }

  if (hour > 23) hour = 23
  if (minute > 59) minute = 59

  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
}

// 解析時間範圍（0800-1400 → { start: '08:00', end: '14:00' }）
const parseTimeRange = (value: string): { start: string; end: string | null } => {
  const normalized = toHalfWidth(value)
  const separatorMatch = normalized.match(/[-~]/)
  if (separatorMatch) {
    const parts = normalized.split(/[-~]/)
    if (parts.length === 2) {
      const start = formatSingleTime(parts[0].trim())
      const end = formatSingleTime(parts[1].trim())
      return { start, end: end || null }
    }
  }
  return { start: formatSingleTime(normalized), end: null }
}

export function EditEventDialog({
  dialog,
  onDialogChange,
  onSubmit,
  onClose,
  loading = false,
}: EditEventDialogProps) {
  const t = useTranslations('calendarPage')
  return (
    <FormDialog
      open={dialog.open}
      onOpenChange={open => !open && onClose()}
      title={t('editDialogTitle')}
      onSubmit={() => {
        if (dialog.title.trim()) onSubmit()
      }}
      submitLabel={t('saveChanges')}
      onCancel={onClose}
      submitDisabled={!dialog.title.trim()}
      loading={loading}
      maxWidth="md"
    >
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-morandi-primary">{t('startDate')}</label>
          <DatePicker
            value={dialog.startDate}
            onChange={date => onDialogChange({ ...dialog, startDate: date })}
            placeholder={t('placeholderSelectDate')}
            className="mt-1"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-morandi-primary">
            {t('endDateOptional2')}
          </label>
          <DatePicker
            value={dialog.endDate}
            onChange={date => onDialogChange({ ...dialog, endDate: date })}
            placeholder={t('placeholderSelectDate')}
            className="mt-1"
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-morandi-primary">{t('titleLabel')}</label>
        <Input
          value={dialog.title}
          onChange={e => onDialogChange({ ...dialog, title: e.target.value })}
          placeholder={t('placeholderEnterTitle')}
          className="mt-1"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-morandi-primary">{t('eventType')}</label>
          <Select
            value={dialog.visibility}
            onValueChange={(value: 'personal' | 'company') =>
              onDialogChange({
                ...dialog,
                visibility: value,
              })
            }
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder={t('placeholderSelectEventType')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="personal">{t('personalCalendar')}</SelectItem>
              <SelectItem value="company">{t('companyCalendar')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium text-morandi-primary">
            {t('startTimeOptional2')}
          </label>
          <Input
            value={dialog.startTime}
            onChange={e => onDialogChange({ ...dialog, startTime: e.target.value })}
            onBlur={e => {
              const { start, end } = parseTimeRange(e.target.value)
              onDialogChange({
                ...dialog,
                startTime: start,
                endTime: end || dialog.endTime,
              })
            }}
            placeholder={t('placeholderTimeRange')}
            className="mt-1"
          />
        </div>
      </div>

      {/* 結束時間 - 有開始時間才顯示 */}
      {dialog.startTime && (
        <div>
          <label className="text-sm font-medium text-morandi-primary">{t('endTimeOptional')}</label>
          <Input
            value={dialog.endTime}
            onChange={e => onDialogChange({ ...dialog, endTime: e.target.value })}
            onBlur={e => onDialogChange({ ...dialog, endTime: formatSingleTime(e.target.value) })}
            placeholder={t('placeholderEndTime')}
            className="mt-1"
          />
        </div>
      )}

      <div>
        <label className="text-sm font-medium text-morandi-primary">
          {t('descriptionOptional2')}
        </label>
        <Input
          value={dialog.description}
          onChange={e => onDialogChange({ ...dialog, description: e.target.value })}
          placeholder={t('placeholderEnterDescription')}
          className="mt-1"
        />
      </div>
    </FormDialog>
  )
}
