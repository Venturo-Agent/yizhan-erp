/**
 * PassportConflictDialog - 護照資料衝突提醒
 *
 * 當護照 OCR 辨識後發現其他未出發訂單的同一客戶有不同護照資料時，
 * 提示使用者是否要一併更新。
 */

import { useState, useCallback } from 'react'
import { EmptyValue } from '@/components/ui/empty-value'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ImageIcon } from 'lucide-react'
import { logger } from '@/lib/utils/logger'
import { toast } from 'sonner'
import type { ActiveOrderConflict } from '@/lib/utils/sync-passport-image'
import { batchUpdateConflictMembers, PASSPORT_FIELD_LABELS } from '@/lib/utils/sync-passport-image'
import { usePassportImageUrl } from '@/lib/passport-storage/usePassportImageUrl'
import { useTranslations } from 'next-intl'

// 簡單圖片顯示 + 載入失敗 fallback
function PassportImage({ url, label }: { url?: string | null; label: string }) {
  const [error, setError] = useState(false)
  const signed = usePassportImageUrl(url)
  return (
    <div className="space-y-1.5">
      <div className="text-[0.647rem] text-morandi-muted font-medium">{label}</div>
      <div className="relative aspect-[3/2] w-full rounded-md overflow-hidden border border-border/60 bg-morandi-container/30 flex items-center justify-center">
        {signed && !error ? (
          <img
            src={signed}
            alt={label}
            className="w-full h-full object-contain"
            onError={() => setError(true)}
          />
        ) : (
          <div className="flex flex-col items-center gap-1 text-morandi-muted text-[0.647rem]">
            <ImageIcon size={20} />
            <span>{error ? '無法載入' : '無圖片'}</span>
          </div>
        )}
      </div>
    </div>
  )
}

interface PassportDataForUpdate {
  passport_number?: string | null
  passport_name?: string | null
  passport_expiry?: string | null
  passport_image_url?: string | null
  birth_date?: string | null
  gender?: string | null
  national_id?: string | null
}

interface PassportConflictDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  conflicts: ActiveOrderConflict[]
  passportData: PassportDataForUpdate
  onComplete?: () => void
}

export function PassportConflictDialog({
  open,
  onOpenChange,
  conflicts,
  passportData,
  onComplete,
}: PassportConflictDialogProps) {
  const t = useTranslations('orders')
  const [isUpdating, setIsUpdating] = useState(false)

  const handleUpdate = useCallback(async () => {
    setIsUpdating(true)
    try {
      const memberIds = conflicts.map(c => c.memberId)
      const count = await batchUpdateConflictMembers(memberIds, passportData)
      toast.success(t('passportConflictSuccess', { count }))
      onOpenChange(false)
      onComplete?.()
    } catch (error) {
      logger.error(t('passportConflictFail'), error)
      toast.error(t('passportConflictFail'))
    } finally {
      setIsUpdating(false)
    }
  }, [conflicts, passportData, onOpenChange, onComplete, t])

  const handleSkip = useCallback(() => {
    onOpenChange(false)
    onComplete?.()
  }, [onOpenChange, onComplete])

  if (conflicts.length === 0) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent level={2} className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('passportConflictTitle')}</DialogTitle>
          <DialogDescription>{t('passportConflictDesc')}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3 py-2">
          {conflicts.map(conflict => (
            <div key={conflict.memberId} className="border rounded-lg p-3 space-y-3 text-sm">
              <div className="flex gap-4 text-muted-foreground">
                <span>
                  {t('passportConflictOrder')}: {conflict.orderCode}
                </span>
                <span>
                  {t('passportConflictTour')}: {conflict.tourName}
                </span>
                <span>
                  {t('passportConflictMember')}: {conflict.memberName}
                </span>
              </div>

              {/* 舊/新護照圖片對照 */}
              <div className="grid grid-cols-2 gap-3">
                <PassportImage url={conflict.oldPassportImageUrl} label={`舊護照（目前存的）`} />
                <PassportImage url={passportData.passport_image_url} label={`新護照（剛上傳）`} />
              </div>

              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-1">{t('passportConflictField')}</th>
                    <th className="text-left py-1">{t('passportConflictOldValue')}</th>
                    <th className="text-left py-1">{t('passportConflictNewValue')}</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(conflict.diffs).map(([field, { oldValue, newValue }]) => (
                    <tr key={field} className="border-b last:border-0">
                      <td className="py-1 font-medium">{PASSPORT_FIELD_LABELS[field] || field}</td>
                      <td className="py-1 text-morandi-red line-through">
                        {oldValue || <EmptyValue />}
                      </td>
                      <td className="py-1 text-morandi-green font-medium">
                        {newValue || <EmptyValue />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="soft-gold" onClick={handleSkip} disabled={isUpdating}>
            {t('passportConflictSkip')}
          </Button>
          <Button onClick={handleUpdate} disabled={isUpdating}>
            {isUpdating ? t('passportConflictUpdating') : t('passportConflictUpdateAll')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
