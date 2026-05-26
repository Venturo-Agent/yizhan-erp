'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { FormDialog } from '@/components/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { AlertTriangle, Plus, Minus, Calendar } from 'lucide-react'
import type { ItinerarySyncInfo } from '../_hooks/useTourEdit'
import type { DailyItineraryDay } from '@/stores/types'

interface ItinerarySyncDialogProps {
  open: boolean
  syncInfo: ItinerarySyncInfo | null
  onSync: (action: 'adjust' | 'ignore', daysToRemove?: number[]) => void
  onClose: () => void
}

export function ItinerarySyncDialog({ open, syncInfo, onSync, onClose }: ItinerarySyncDialogProps) {
  const t = useTranslations('tour')
  // State for tracking which days to remove (when decreasing)
  const [selectedDays, setSelectedDays] = useState<number[]>([])

  // Get daily itinerary from sync info
  const dailyItinerary = useMemo(() => {
    if (!syncInfo?.itinerary?.daily_itinerary) return []
    return syncInfo.itinerary.daily_itinerary as DailyItineraryDay[]
  }, [syncInfo])

  // Calculate how many days need to be removed
  const daysToRemoveCount = useMemo(() => {
    if (!syncInfo || syncInfo.action !== 'decrease') return 0
    return syncInfo.currentDays - syncInfo.newDays
  }, [syncInfo])

  // Initialize selected days (default: last N days)
  React.useEffect(() => {
    if (syncInfo?.action === 'decrease' && dailyItinerary.length > 0) {
      const defaultSelected = dailyItinerary.map((_, idx) => idx).slice(-daysToRemoveCount)
      setSelectedDays(defaultSelected)
    } else {
      setSelectedDays([])
    }
  }, [syncInfo, dailyItinerary, daysToRemoveCount])

  // Toggle day selection
  const toggleDay = useCallback((dayIndex: number) => {
    setSelectedDays(prev => {
      if (prev.includes(dayIndex)) {
        return prev.filter(d => d !== dayIndex)
      } else {
        return [...prev, dayIndex]
      }
    })
  }, [])

  // Check if selection is valid
  const isSelectionValid = useMemo(() => {
    if (!syncInfo) return false
    if (syncInfo.action === 'increase') return true
    return selectedDays.length === daysToRemoveCount
  }, [syncInfo, selectedDays, daysToRemoveCount])

  // Handle confirm
  const handleConfirm = useCallback(() => {
    if (!syncInfo) return

    if (syncInfo.action === 'decrease') {
      onSync('adjust', selectedDays)
    } else {
      onSync('adjust')
    }
  }, [syncInfo, selectedDays, onSync])

  // Handle ignore
  const handleIgnore = useCallback(() => {
    onSync('ignore')
  }, [onSync])

  if (!syncInfo) return null

  const customFooter = (
    <div className="flex justify-end gap-2">
      <Button variant="soft-gold" onClick={handleIgnore}>
        {t('itinerarySyncKeepOriginal')}
      </Button>
      <Button
        onClick={handleConfirm}
        disabled={!isSelectionValid}
        className={
          syncInfo.action === 'decrease' ? 'bg-status-warning hover:bg-status-warning/80' : ''
        }
      >
        {syncInfo.action === 'decrease'
          ? t('itinerarySyncConfirmRemove')
          : t('itinerarySyncConfirmAdd')}
      </Button>
    </div>
  )

  return (
    <FormDialog
      open={open}
      onOpenChange={isOpen => !isOpen && onClose()}
      title={
        <span className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-status-warning" />
          {t('itinerarySyncTitle')}
        </span>
      }
      subtitle={t('itinerarySyncSubtitle')}
      footer={customFooter}
      loading={false}
      level={2}
      maxWidth="lg"
    >
      <div className="py-4 space-y-4">
        {/* Summary info */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t('itinerarySyncItineraryName')}</span>
            <span className="font-medium">
              {syncInfo.itinerary.title || syncInfo.itinerary.name || t('itinerarySyncUnnamed')}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t('itinerarySyncCurrentDays')}</span>
            <span className="font-medium">
              {syncInfo.currentDays} {t('itinerarySyncDayUnit')}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t('itinerarySyncNewDays')}</span>
            <span className="font-medium text-primary">
              {syncInfo.newDays} {t('itinerarySyncDayUnit')}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm pt-2 border-t">
            <span className="text-muted-foreground">{t('itinerarySyncChange')}</span>
            <span
              className={`font-medium flex items-center gap-1 ${
                syncInfo.action === 'increase' ? 'text-morandi-green' : 'text-status-warning'
              }`}
            >
              {syncInfo.action === 'increase' ? (
                <>
                  <Plus className="h-4 w-4" />
                  {t('itinerarySyncIncreasePrefix')} {syncInfo.newDays - syncInfo.currentDays}{' '}
                  {t('itinerarySyncDayUnit')}
                </>
              ) : (
                <>
                  <Minus className="h-4 w-4" />
                  {t('itinerarySyncDecreasePrefix')} {syncInfo.currentDays - syncInfo.newDays}{' '}
                  {t('itinerarySyncDayUnit')}
                </>
              )}
            </span>
          </div>
        </div>

        {/* Day selection for decrease */}
        {syncInfo.action === 'decrease' && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {t('itinerarySyncSelectDaysToRemove')}{' '}
              <span className="font-medium text-foreground">{daysToRemoveCount}</span>{' '}
              {t('itinerarySyncDayColon')}
            </p>
            <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
              {dailyItinerary.map((day, idx) => (
                <label
                  key={idx}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedDays.includes(idx)
                      ? 'bg-destructive/10 border-destructive/50'
                      : 'bg-background hover:bg-muted/50'
                  }`}
                >
                  <Checkbox
                    checked={selectedDays.includes(idx)}
                    onCheckedChange={() => toggleDay(idx)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-medium">{day.dayLabel}</span>
                      <span className="text-muted-foreground text-sm">{day.date}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 truncate">
                      {day.title || t('itinerarySyncSetTitle')}
                    </p>
                  </div>
                </label>
              ))}
            </div>
            {selectedDays.length !== daysToRemoveCount && (
              <p className="text-sm text-status-warning">
                {t('itinerarySyncSelectExactDays', {
                  required: daysToRemoveCount,
                  selected: selectedDays.length,
                })}
              </p>
            )}
          </div>
        )}

        {/* Message for increase */}
        {syncInfo.action === 'increase' && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {t('itinerarySyncAppendBlankDays')}{' '}
              <span className="font-medium text-foreground">
                {syncInfo.newDays - syncInfo.currentDays}
              </span>{' '}
              {t('itinerarySyncBlankDays')}
            </p>
            <p className="text-sm text-muted-foreground">{t('itinerarySyncAddNote')}</p>
          </div>
        )}
      </div>
    </FormDialog>
  )
}
