'use client'

/**
 * ItineraryEditHeader — 行程編輯區頂部操作列
 *
 * 包含：
 * - 行程標題 Input
 * - 天數調整 Input（調整後自動同步 tours.return_date）
 * - 預覽 / 儲存按鈕
 */

import { useTranslations } from 'next-intl'
import { Eye, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { logger } from '@/lib/utils/logger'
import { toast } from 'sonner'
import { updateTour } from '@/data/entities/tours'

const UPDATE_RETURN_DATE_FAILED = '更新回程日期失败'

interface ItineraryEditHeaderProps {
  title: string
  setTitle: (v: string) => void
  numDays: number
  setNumDays: (v: number) => void
  saving: boolean
  currentItineraryId: string | null
  tourId: string
  tourDepartureDate?: string
  onPreview: () => void
  onSave: () => void
}

export function ItineraryEditHeader({
  title,
  setTitle,
  numDays,
  setNumDays,
  saving,
  currentItineraryId,
  tourId,
  tourDepartureDate,
  onPreview,
  onSave,
}: ItineraryEditHeaderProps) {
  const t = useTranslations('tour')
  return (
    <div className="p-4 pb-2">
      <div className="flex items-end gap-3 mb-3">
        <div className="flex-1 space-y-1">
          <Label className="text-xs text-muted-foreground">
            {t('itineraryEditTitleRequired')}
          </Label>
          <Input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder={t('itineraryEditPlaceholder')}
            className="h-8 text-sm"
          />
        </div>
        <div className="w-20 space-y-1">
          <Label className="text-xs text-muted-foreground">
            {t('itineraryEditAdjustDays')}
          </Label>
          <Input
            type="number"
            min={1}
            max={30}
            value={numDays}
            onChange={e => {
              const v = parseInt(e.target.value, 10)
              if (v >= 1 && v <= 30) {
                setNumDays(v)
                if (tourDepartureDate && tourId) {
                  const start = new Date(tourDepartureDate)
                  const newReturnDate = new Date(start)
                  newReturnDate.setDate(start.getDate() + v - 1)
                  const returnDateStr = newReturnDate.toISOString().split('T')[0]

                  updateTour(tourId, { return_date: returnDateStr })
                    .then(() => {
                      toast.success(`已同步更新团的回程日期为 ${returnDateStr}`)
                    })
                    .catch(err => {
                      logger.error('更新团回程日期失败', err)
                      toast.error(UPDATE_RETURN_DATE_FAILED)
                    })
                }
              }
            }}
            className="h-8 text-sm"
          />
        </div>
        <div className="flex items-end gap-2">
          <Button
            variant="soft-gold"
            size="sm"
            onClick={onPreview}
            className="h-8 px-2 text-xs gap-1"
          >
            <Eye size={12} />
            {t('itineraryEditPreview')}
          </Button>
          <Button
            variant="soft-gold"
            size="sm"
            onClick={onSave}
            disabled={saving || !title.trim()}
            className="h-8 px-3 text-xs gap-1"
          >
            {saving ? <Spinner size="sm" /> : <Save className="w-3 h-3" />}
            {currentItineraryId ? t('itineraryEditUpdateBtn') : t('itineraryEditCreateBtn')}
          </Button>
        </div>
      </div>
    </div>
  )
}
