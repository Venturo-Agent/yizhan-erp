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
  const inputCls =
    'h-7 text-sm text-center border-0 bg-transparent shadow-none px-0 py-0 focus-visible:ring-0 rounded-none'

  return (
    <table className="w-full border-collapse border-b border-border">
      <tbody>
        <tr>
          <td className="px-2 py-1 text-xs text-center text-muted-foreground table-divider whitespace-nowrap w-[80px] bg-morandi-gold-header/40">
            行程標題
          </td>
          <td className="px-2 py-1 table-divider">
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={t('itineraryEditPlaceholder')}
              className={inputCls}
            />
          </td>
          <td className="px-2 py-1 text-xs text-center text-muted-foreground table-divider whitespace-nowrap w-[64px] bg-morandi-gold-header/40">
            {t('itineraryEditAdjustDays')}
          </td>
          <td className="px-2 py-1 table-divider w-[64px]">
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
              className={inputCls}
            />
          </td>
          <td className="px-1 py-1 w-[72px] table-divider">
            <Button
              variant="ghost"
              size="sm"
              onClick={onPreview}
              className="h-7 w-full px-1.5 text-[11px] gap-1"
            >
              <Eye size={11} />
              {t('itineraryEditPreview')}
            </Button>
          </td>
          <td className="px-1 py-1 w-[64px]">
            <Button
              variant="ghost"
              size="sm"
              onClick={onSave}
              disabled={saving || !title.trim()}
              className="h-7 w-full px-2 text-[11px] gap-1"
            >
              {saving ? <Spinner size="sm" /> : <Save className="w-3 h-3" />}
              {currentItineraryId ? '更新' : '存檔'}
            </Button>
          </td>
        </tr>
      </tbody>
    </table>
  )
}
