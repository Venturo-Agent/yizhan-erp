'use client'

import { useTranslations } from 'next-intl'
import { FormDialog } from '@/components/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Check, X } from 'lucide-react'

export interface AccommodationChange {
  dayNumber: number
  oldHotel: string
  newHotel: string
  hasQuote: boolean // 報價單已有成本
  quotedPrice?: number
  hasRequest: boolean // 需求單已發出
  requestStatus?: string
}

interface AccommodationChangeDialogProps {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
  changes: AccommodationChange[]
  /** 提交中、防連點（disable 按鈕、避免 pendingSaveRef 連點觸發） */
  loading?: boolean
}

export function AccommodationChangeDialog({
  open,
  onConfirm,
  onCancel,
  changes,
  loading = false,
}: AccommodationChangeDialogProps) {
  const t = useTranslations('tour')
  const quoteChanges = changes.filter(c => c.hasQuote)
  const requestChanges = changes.filter(c => c.hasRequest)

  const customFooter = (
    <div className="flex items-center justify-end gap-2">
      <Button variant="soft-gold" onClick={onCancel} disabled={loading}>
        <X className="h-4 w-4 mr-1" />
        {t('accommodationChangeCancel')}
      </Button>
      <Button variant="soft-gold" onClick={onConfirm} disabled={loading}>
        <Check className="h-4 w-4 mr-1" />
        {loading ? '處理中...' : t('accommodationChangeConfirm')}
      </Button>
    </div>
  )

  return (
    <FormDialog
      open={open}
      onOpenChange={v => {
        if (!v && !loading) onCancel()
      }}
      title={
        <span className="flex items-center gap-2 text-morandi-gold">
          <AlertTriangle size={20} />
          {t('accommodationChangeTitle')}
        </span>
      }
      footer={customFooter}
      loading={loading}
      maxWidth="md"
    >
      <div className="space-y-3 text-sm">
        <p className="text-foreground">{t('accommodationChangeDetected')}</p>

        {changes.map(c => (
          <div key={c.dayNumber} className="bg-muted/50 rounded-md p-2 space-y-1">
            <div className="font-medium">
              {t('accommodationChangeDay')} {c.dayNumber} {t('accommodationChangeDayUnit')}
            </div>
            <div className="text-muted-foreground line-through text-xs">{c.oldHotel}</div>
            <div className="text-foreground text-xs">→ {c.newHotel}</div>
          </div>
        ))}

        {quoteChanges.length > 0 && (
          <div className="bg-morandi-gold/10 border border-morandi-gold/30 rounded-md p-2">
            <p className="font-medium text-morandi-primary">{t('accommodationChangeQuoteImpact')}</p>
            <p className="text-morandi-gold text-xs mt-1">
              {t('accommodationChangeQuoteNote')}
            </p>
            <ul className="text-xs text-morandi-gold mt-1 space-y-0.5">
              {quoteChanges.map(c => (
                <li key={c.dayNumber}>
                  {t('accommodationChangeDay')} {c.dayNumber} {t('accommodationChangeDayDash')} {c.oldHotel}
                  {c.quotedPrice ? ` ($${c.quotedPrice.toLocaleString()})` : ''}
                </li>
              ))}
            </ul>
          </div>
        )}

        {requestChanges.length > 0 && (
          <div className="bg-morandi-red/10 border border-morandi-red/30 rounded-md p-2">
            <p className="font-medium text-morandi-red">{t('accommodationChangeRequirementImpact')}</p>
            <p className="text-morandi-red text-xs mt-1">
              {t('accommodationChangeRequirementNote')}
            </p>
            <ul className="text-xs text-morandi-red mt-1 space-y-0.5">
              {requestChanges.map(c => (
                <li key={c.dayNumber}>
                  {t('accommodationChangeDay')} {c.dayNumber} {t('accommodationChangeDayDash')} {c.oldHotel}（{c.requestStatus || '已發出'}）
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </FormDialog>
  )
}
